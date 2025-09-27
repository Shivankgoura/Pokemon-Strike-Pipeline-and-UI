import { GoogleGenAI, Type } from "@google/genai";
import { Annotation, ParsedOrders, Detection, Coordinate, Score } from '../types';
import { POKEMON_CLASSES } from '../constants';
import { sampleInstancesData } from '../data';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper function to convert File to base64 for Gemini API
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}


// Real Gemini API call for NLP
export const parseOrders = async (ordersText: string): Promise<ParsedOrders> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found. Returning mock data for NLP.");
    // Simple mock parser
    const targets = (ordersText.match(/(kill|neutralize|eliminate|target) (all hostile )?(\w+)/i) || [])[3]?.toLowerCase();
    const protectedSpecies = (ordersText.match(/(protect|avoid|do not engage) (all |any )?(\w+)/i) || [])[3]?.toLowerCase();
    return {
      targets: targets ? [targets] : [],
      protected: protectedSpecies ? [protectedSpecies] : [],
    };
  }

  const prompt = `
    You are a tactical command AI. Your mission is to parse complex and sometimes indirect military orders to identify targets and protected entities.
    The possible entities are Pokémon: Pikachu, Charizard, Bulbasaur, Mewtwo.
    From the provided orders, extract a list of species to target for neutralization and a list of species to protect at all costs.
    If an order says to engage a "fire-type", that means Charizard. If it mentions "electric mouse", that's Pikachu. "Seed" or "plant-like" refers to Bulbasaur. "Legendary psychic" refers to Mewtwo.
    Analyze the sentiment and explicit commands. For example, "don't harm bulbasaurs" means they are protected. "Take out all charizards" means they are targets.
    Respond ONLY with a JSON object containing two keys: "targets" and "protected", both of which should be arrays of strings. The strings should be the lowercase species names.

    Orders: "${ordersText}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targets: {
              type: Type.ARRAY,
              description: "List of Pokémon species to target.",
              items: { type: Type.STRING }
            },
            protected: {
              type: Type.ARRAY,
              description: "List of Pokémon species to protect.",
              items: { type: Type.STRING }
            },
          },
        },
      },
    });
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    return {
        targets: parsed.targets.map((t: string) => t.toLowerCase()),
        protected: parsed.protected.map((p: string) => p.toLowerCase()),
    };
  } catch (error) {
    console.error("Error parsing orders with Gemini:", error);
    throw new Error("Failed to parse mission orders.");
  }
};


// Real CV detection service using Gemini
export const detectPokemon = async (imageFile: File): Promise<Omit<Detection, 'id' | 'isTarget' | 'isProtected' | 'bboxNormalized'>[]> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found for vision. Falling back to mock detection.");
    const imageInfo = sampleInstancesData.images.find(img => img.file_name === imageFile.name);
    if (!imageInfo) return [];
    
    const annotations: Annotation[] = sampleInstancesData.annotations.filter(
      (ann) => ann.image_id === imageInfo.id
    );

    return annotations.map((ann) => {
        const [x, y, w, h] = ann.bbox;
        const { width, height } = imageInfo;
        
        const y_min = y;
        const x_min = x;
        const y_max = y + h;
        const x_max = x + w;

        const bboxNormalized = [
            Math.round((y_min / height) * 1000),
            Math.round((x_min / width) * 1000),
            Math.round((y_max / height) * 1000),
            Math.round((x_max / width) * 1000),
        ];
        
        return {
            class_id: ann.category_id,
            species: POKEMON_CLASSES[ann.category_id] || 'unknown',
            bbox: bboxNormalized as [number, number, number, number],
            confidence: 0.95, // Mock confidence
        };
    });
  }
  
  const imagePart = await fileToGenerativePart(imageFile);

 const prompt = `
    Analyze the input image to identify and localize all Pokémon characters.
    For each detected Pokémon, provide its species name, a confidence score from 0.0 to 1.0, and a precise bounding box.
    The confidence score should represent how certain you are about the detection.
    The bounding box must be in the format [y_min, x_min, y_max, x_max].
    The coordinates must be normalized to a 0-1000 integer scale relative to the image dimensions.
    Ensure bounding boxes are tightly fitted to the Pokémon contours and do not extend beyond the image frame.
    Your response must be a JSON array of objects, with no other text or explanation.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        species: {
          type: Type.STRING,
          description: "The name of the Pokémon species detected (e.g., 'pikachu', 'charizard').",
        },
        bbox: {
          type: Type.ARRAY,
          description: "Bounding box in [y_min, x_min, y_max, x_max] format, normalized to a 0-1000 integer scale.",
          items: { type: Type.NUMBER },
          minItems: 4,
          maxItems: 4,
        },
        confidence: {
            type: Type.NUMBER,
            description: "The confidence score for the detection, between 0.0 and 1.0.",
        }
      },
      required: ["species", "bbox", "confidence"]
    },
  };
  
  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [ imagePart, { text: prompt } ] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    const rawDetections = JSON.parse(jsonText);
    
    const pokemonClassMap = Object.fromEntries(Object.entries(POKEMON_CLASSES).map(([id, name]) => [name, parseInt(id)]));

    return rawDetections.map((rawDet: any) => {
        const species = rawDet.species.toLowerCase();
        return {
            class_id: pokemonClassMap[species] || 0, // 0 for unknown
            species: species,
            bbox: rawDet.bbox, // This is now the normalized bbox
            confidence: rawDet.confidence,
        };
    });

  } catch (error) {
    console.error("Error detecting Pokémon with Gemini:", error);
    throw new Error("Failed to perform object detection on the battlefield image.");
  }
};


// Mock Decision Fusion Engine
export const generateCoordinates = async (detections: Detection[], ammo: number): Promise<Coordinate[]> => {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 1000));

  const targets = detections.filter(d => d.isTarget && !d.isProtected);
  
  // Simple logic: target the center of the first `ammo` targets
  const coords: Coordinate[] = targets.slice(0, ammo).map(t => {
    const [x, y, w, h] = t.bbox;
    return [x + w / 2, y + h / 2];
  });

  return coords;
};

// Engagement Simulation based on mission brief scoring
export const simulateEngagement = async (detections: Detection[], coordinates: Coordinate[]): Promise<Score> => {
  await new Promise(res => setTimeout(res, 500));

  let correctHits = 0;
  let collateralHits = 0;
  let misses = 0;
  const hitPokemonIds = new Set<number>();

  for (const coord of coordinates) {
      const [cx, cy] = coord;
      let shotHitSomething = false;

      // Find all pokemon under this coordinate
      const hitDetections = detections.filter(det => {
          const [x, y, w, h] = det.bbox;
          return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
      });

      if (hitDetections.length > 0) {
          shotHitSomething = true;
          for (const hit of hitDetections) {
              if (hitPokemonIds.has(hit.id)) {
                  continue; // This pokemon was already hit by a previous shot.
              }
              if (hit.isTarget) {
                  correctHits++;
              } else { // Protected or neutral are both collateral
                  collateralHits++;
              }
              hitPokemonIds.add(hit.id);
          }
      }

      if (!shotHitSomething) {
          misses++;
      }
  }

  // Check for bonus: +1 for killing all existing enemy pokemon
  const totalTargetPokemon = detections.filter(d => d.isTarget).length;
  const neutralizedTargets = Array.from(hitPokemonIds).filter(id => {
      const det = detections.find(d => d.id === id);
      return det?.isTarget;
  }).length;

  const bonus = (totalTargetPokemon > 0 && neutralizedTargets === totalTargetPokemon) ? 1 : 0;
  
  // Penalty for ammunition waste: -1 for every 3 missed shots
  const ammoPenalty = Math.floor(misses / 3);
  
  // Final Score = (Correct Hits) - (Collateral Hits) - (Ammo Penalty) + Bonus
  const totalScore = correctHits - collateralHits - ammoPenalty + bonus;

  return {
      hits: correctHits,
      misses: misses,
      collateral: collateralHits,
      total: totalScore,
  };
};