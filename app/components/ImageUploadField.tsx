"use client";

import { useRef, useState } from "react";

export default function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>("");

  async function handlePick(file?: File | null) {
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/70">Image (upload)</div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload image"}
        </button>

        <span className="text-xs text-white/50 break-all">
          {value ? `✅ ${value}` : "No image uploaded"}
        </span>
      </div>

      {(preview || value) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview || value}
            alt="Preview"
            className="w-full max-w-sm rounded-xl object-cover"
          />
        </div>
      )}
    </div>
  );
}