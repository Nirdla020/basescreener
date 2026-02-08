"use client";

import CreateOnZoraButton from "./CreateOnZoraButton";

export default function CreateOnZoraCard() {
  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-white">Create</h2>
          <p className="text-sm text-white/70">
            Create a coin on Zora.
          </p>

          <div className="mt-4 flex justify-end">
            <CreateOnZoraButton />
          </div>
        </div>
      </div>
    </section>
  );
}