export function parseNotesGroup(notes?: string | null) {
  let cleanNotes = (notes || '').replace(/^(?:\[(?:cid:[^\]]+|gen:crono)\]\s*)+/, '');
  const groupMatch = cleanNotes.match(/^\[groupId:([^\]]+)\]\s*/);
  if (groupMatch) cleanNotes = cleanNotes.slice(groupMatch[0].length);

  const tagMatch = cleanNotes.match(/^(#[A-Za-z0-9_]+)(?:\s*-\s*|\s+|$)/);
  if (tagMatch) cleanNotes = cleanNotes.slice(tagMatch[0].length);

  return { groupId: groupMatch?.[1] ?? null, tag: tagMatch?.[1] ?? null, cleanNotes: cleanNotes.trim() };
}
