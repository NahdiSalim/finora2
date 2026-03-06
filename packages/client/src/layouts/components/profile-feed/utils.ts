import type { Post as ApiPost } from "src/lib/services/postsApi";

export function formatPostDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function postDisplayName(post: ApiPost): string {
  const name = post.company?.name;
  if (name) return name;
  const first = post.author?.firstName ?? "";
  const last = post.author?.lastName ?? "";
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return "Anonyme";
}

export function postDisplayAvatar(post: ApiPost): string | null {
  const url = post.author?.photoUrl ?? null;
  return url && String(url).trim() !== "" ? url : null;
}

export function postAuthorInitials(post: ApiPost): string {
  const name = postDisplayName(post);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  if (parts.length === 1 && parts[0].length >= 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "?";
}

/** URLs des images/pièces jointes du post (API renvoie attachments ou imageUrls) */
export function postImageUrls(post: ApiPost): string[] {
  return post.attachments ?? post.imageUrls ?? post.images ?? [];
}
