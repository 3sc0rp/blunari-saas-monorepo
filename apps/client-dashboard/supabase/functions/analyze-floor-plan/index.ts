/// <reference path="../shared-types.d.ts" />

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error("No image provided");
    }

    console.log("Analyzing floor plan with GPT-4 Vision...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a CONSERVATIVE restaurant floor plan analyzer. Your goal is to identify ONLY clearly visible dining tables and seating - DO NOT speculate or detect uncertain objects.

STRICT DETECTION RULES:
1. ONLY identify objects you can see with HIGH CONFIDENCE (90%+)
2. ONLY count actual dining furniture:
   - Round tables (clear circular shapes with visible chairs around them)
   - Rectangular dining tables (clear rectangular shapes with visible chairs)
   - Booth seating (L-shaped or U-shaped seating with obvious dining surfaces)
   - Bar seating (clear counter with visible bar stools)

3. DO NOT detect:
   - Unclear or ambiguous shapes
   - Objects that might be decorative furniture
   - Service counters or host stands
   - Kitchen equipment or prep areas
   - Storage areas or wait stations
   - Anything that's not clearly for customer dining

4. CONSERVATIVE POSITIONING:
   - Position coordinates 0-10 (X=left to right, Y=top to bottom)
   - Only place tables where you can clearly see them
   - If uncertain about position, don't include the table

5. CAPACITY ESTIMATION:
   - Count visible chairs or seating spaces around each table
   - Round tables: typically 2-6 people
   - Rectangular tables: typically 2-8 people
   - Booths: typically 4-6 people
   - Bar seating: 1 person per visible stool

6. CONFIDENCE REQUIREMENTS:
   - Only include tables with 80%+ confidence
   - If you're not sure it's a dining table, exclude it
   - Better to detect fewer tables accurately than many incorrectly

Return JSON format:
{
  "tableCount": number,
  "detectedTables": [
    {
      "id": "table_X",
      "name": "Table X", 
      "position": {"x": 0-10, "y": 0-10},
      "confidence": 0.8-1.0,
      "estimatedCapacity": number,
      "tableType": "round|rectangular|booth|bar",
      "description": "What specifically makes you confident this is a dining table"
    }
  ],
  "confidence": 0.0-1.0,
  "recommendations": ["specific observations"],
  "analysis": "Detailed explanation of what dining furniture you clearly identified"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this restaurant floor plan image with CONSERVATIVE accuracy. Only identify dining tables and seating that you can see clearly and confidently.

CRITICAL: Only detect objects that are CLEARLY dining tables:
- You must be able to see the table surface AND seating around it
- Don't guess or speculate about unclear shapes
- Only include tables with 80%+ confidence
- Focus on customer dining areas, not service/kitchen areas

Be very careful and precise - it's better to miss a table than to incorrectly identify something that isn't a dining table.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error details:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData,
      });
      throw new Error(
        `OpenAI API error: ${response.status} - ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("GPT-4 Vision analysis complete");

    const content = data.choices[0].message.content;

    // Try to parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.log("Raw response:", content);

      // Fallback response if JSON parsing fails
      analysisResult = {
        tableCount: 0,
        detectedTables: [],
        confidence: 0,
        recommendations: [
          "AI analysis detected furniture but had difficulty parsing the exact layout",
          "The image may contain tables that weren't clearly identified",
          "Try uploading a higher contrast image with better lighting",
          "Consider manually positioning tables using the Floor Plan view",
          "Ensure the floor plan shows clear table and seating arrangements",
        ],
        analysis:
          "Analysis completed but encountered parsing difficulties - tables may be present",
      };
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-floor-plan function:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    });

    // Handle specific OpenAI errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    let recommendations = [
      `Analysis failed: ${errorMessage}`,
      "This could be due to:",
      "• API rate limits (OpenAI usage exceeded)",
      "• Network connectivity issues",
      "• API key configuration problems",
      "• Floor plan image too complex or unclear",
      "You can manually position tables using the Floor Plan view for now",
    ];

    // Check for specific error types
    if (errorMessage.includes("429")) {
      recommendations = [
        "OpenAI API rate limit exceeded",
        "• Please wait a few minutes before trying again",
        "• The free tier has usage limits",
        "• You can manually position tables using the Floor Plan view",
        "• Consider upgrading your OpenAI plan for higher limits",
      ];
    } else if (errorMessage.includes("401")) {
      recommendations = [
        "OpenAI API authentication failed",
        "• Check if your OpenAI API key is valid",
        "• Ensure the API key has proper permissions",
        "• You can manually position tables for now",
      ];
    }

    const errorResponse = {
      tableCount: 0,
      detectedTables: [],
      confidence: 0,
      recommendations,
      analysis:
        "Analysis failed due to technical error - manual table placement available",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 so the frontend can handle the error gracefully
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
