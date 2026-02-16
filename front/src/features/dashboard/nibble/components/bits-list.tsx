"use client";

import BreadCrumb from "@/core/presentation/components/breadcrumb";
import { useAppStore } from "@/store/app-store";
import { useShallow } from "zustand/shallow";

export default function BitsList() {
  const { containers } = useAppStore(
    useShallow((state) => ({
      containers: state.containers,
    }))
  );

  return (
    <main className="flex flex-col gap-8 w-full max-w-[1440px] mx-auto p-4 md:p-8">
      <BreadCrumb />

      <header className="w-full flex flex-col">
        <h1 className="font-bold text-2xl">Nibble</h1>
        <p className="text-sm text-gray-500">
          Manage your bits, deploy applications, and scale your infrastructure
          with ease.
        </p>
      </header>

      <section className="flex justify-between items-center ">
        <h2 className="font-bold text-xl">Overview</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Create New Bit
        </button>
      </section>

      <section>
        <h2 className="font-bold text-xl">Your Bits</h2>
        <ul className="mt-4">
          {containers?.map((vm) => (
            <li key={vm.id} className="border-b py-2">
              <h3 className="font-semibold">{vm.name}</h3>
              <p className="text-sm text-gray-500">Status: {vm.status}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
