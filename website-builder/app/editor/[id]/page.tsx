"use client";

import { useParams } from "next/navigation";
import EditorPage from "../page";

export default function EditorIdPage() {
  const params = useParams();
  const websiteId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  return <EditorPage websiteId={websiteId} />;
} 