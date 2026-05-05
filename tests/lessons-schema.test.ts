import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const LESSONS_DIR = resolve(__dirname, "..", "examples", "lessons");
const SCHEMA_PATH = join(LESSONS_DIR, "_shared", "lessons-schema.json");

interface SlideSchema {
  $schema?: string;
  type: "array";
  minItems?: number;
  items: {
    type: "object";
    required: string[];
    additionalProperties: boolean;
    properties: Record<string, { type: string; pattern?: string; minLength?: number }>;
  };
}

function loadSchema(): SlideSchema {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
}

function findLessonDirs(): string[] {
  // Picks up _template plus any L<NN>-<slug> directory.
  return readdirSync(LESSONS_DIR)
    .filter((name) => {
      if (name.startsWith(".")) return false;
      if (name === "_shared") return false;
      const path = join(LESSONS_DIR, name);
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

function validateSlide(
  slide: unknown,
  schema: SlideSchema,
  index: number,
): string[] {
  const errors: string[] = [];
  if (typeof slide !== "object" || slide === null || Array.isArray(slide)) {
    errors.push(`slide[${index}] must be an object`);
    return errors;
  }
  const obj = slide as Record<string, unknown>;
  const props = schema.items.properties;
  const required = schema.items.required;

  for (const key of required) {
    if (!(key in obj)) {
      errors.push(`slide[${index}] missing required field "${key}"`);
    }
  }

  if (schema.items.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (!(key in props)) {
        errors.push(`slide[${index}] has unknown field "${key}"`);
      }
    }
  }

  for (const [key, def] of Object.entries(props)) {
    if (!(key in obj)) continue;
    const value = obj[key];
    if (def.type === "string") {
      if (typeof value !== "string") {
        errors.push(`slide[${index}].${key} must be a string`);
        continue;
      }
      if (def.minLength !== undefined && value.length < def.minLength) {
        errors.push(
          `slide[${index}].${key} must be at least ${def.minLength} character(s)`,
        );
      }
      if (def.pattern && !new RegExp(def.pattern).test(value)) {
        errors.push(
          `slide[${index}].${key} ("${value}") does not match pattern ${def.pattern}`,
        );
      }
    }
  }

  return errors;
}

function validateSlides(slides: unknown, schema: SlideSchema): string[] {
  if (!Array.isArray(slides)) return ["slides.json must be a JSON array"];
  if (schema.minItems !== undefined && slides.length < schema.minItems) {
    return [`slides.json must have at least ${schema.minItems} slide(s)`];
  }
  const errors: string[] = [];
  slides.forEach((slide, i) => {
    errors.push(...validateSlide(slide, schema, i));
  });
  // ids must be unique within a lesson.
  const ids = slides
    .map((s) => (s as { id?: unknown }).id)
    .filter((v): v is string => typeof v === "string");
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate slide id "${id}"`);
    seen.add(id);
  }
  return errors;
}

describe("lesson slides.json conform to schema", () => {
  const schema = loadSchema();
  const dirs = findLessonDirs();

  it("finds at least the _template lesson", () => {
    expect(dirs).toContain("_template");
  });

  for (const dir of dirs) {
    const slidesPath = join(LESSONS_DIR, dir, "slides.json");
    let slides: unknown;
    try {
      slides = JSON.parse(readFileSync(slidesPath, "utf8"));
    } catch (e) {
      it(`${dir}/slides.json exists and parses as JSON`, () => {
        throw e;
      });
      continue;
    }
    it(`${dir}/slides.json conforms to schema`, () => {
      const errors = validateSlides(slides, schema);
      expect(errors).toEqual([]);
    });
  }
});
