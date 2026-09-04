import type { CategoryField, Profile } from '@/types/domain';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches a line that opens with `label`, a separator, then a value —
 * "Role: Protagonist", "Role - Protagonist", "role — Protagonist",
 * "Role | Protagonist". */
function labelLinePattern(label: string): RegExp {
  return new RegExp(`^[ \\t]*${escapeRegExp(label)}[ \\t]*[:|\\-–—][ \\t]*(.+)$`, 'im');
}

/** "firstName" -> "first name" — lets a field also be recognised by a
 * plain-English reading of its id, since the built-in ids predate whatever
 * label a project has since given them. */
function idAsWords(id: string): string {
  return id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toLowerCase();
}

const NOTES_LABEL = /^notes?$/i;

/**
 * Best-effort extraction of a category's fields out of a block of plain
 * prose — the "Label: value" (or "Label - value", "Label | value") lines a
 * lot of people already write by hand when jotting down a character or
 * place before this app had structured fields for them. Works for any
 * category's field list, built-in or user-defined, since it only ever
 * looks at `fields`, never a hardcoded shape.
 *
 * Each matched line is removed from the pool once claimed, so the same
 * sentence can't fill two fields. Whatever prose is left over after every
 * field has had its turn lands in a field literally labelled "Notes" or
 * "Note" (case-insensitive), if the category has one — the same place
 * existing Location/Creature/Tech documents' old body text ended up. If a
 * field's own label happens to be "Notes", it's treated as that catch-all
 * rather than matched by a labelled line itself.
 *
 * This is a heuristic, not a parser: prose that never uses a "Label:"
 * convention just won't match anything, and nothing is lost by that — the
 * note's own text stays exactly as written, this only decides what also
 * gets copied into the new profile.
 */
export function extractProfileFromText(text: string, fields: CategoryField[]): Profile {
  const profile: Profile = {};
  let remaining = text;

  for (const field of fields) {
    if (NOTES_LABEL.test(field.label)) continue;

    const candidates = [field.label, idAsWords(field.id)].filter((label) => label.trim());
    for (const label of candidates) {
      const match = labelLinePattern(label).exec(remaining);
      if (!match) continue;
      const value = match[1].trim();
      if (value) {
        profile[field.id] = value;
        remaining =
          remaining.slice(0, match.index) + remaining.slice(match.index + match[0].length);
        remaining = remaining.trim();
      }
      break;
    }
  }

  const notesField = fields.find((field) => NOTES_LABEL.test(field.label) && field.type === 'textarea');
  const leftover = remaining.replace(/\n{3,}/g, '\n\n').trim();
  if (notesField && leftover) {
    profile[notesField.id] = leftover;
  }

  return profile;
}
