"use client";

import BreadCrumb from "@/core/presentation/components/breadcrumb";
import { useAppStore } from "@/store/app-store";
import { useShallow } from "zustand/shallow";

export default function InstancesList() {
  const { vpcs } = useAppStore(
    useShallow((state) => ({
      vpcs: state.vpcs,
    }))
  );

  return (
    <main className="flex flex-col gap-8 w-full max-w-[1440px] mx-auto p-4 md:p-8">
      <BreadCrumb />

      <header className="w-full flex flex-col">
        <h1 className="font-bold text-2xl">Mesh</h1>
        <p className="text-sm text-gray-500">
          You can create, manage, and monitor your nodes from this dashboard.
        </p>
      </header>

      <section className="flex justify-between items-center ">
        <h2 className="font-bold text-xl">Overview</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Create New Node
        </button>
      </section>

      <section>
        <h2 className="font-bold text-xl">Your Nodes</h2>
        <ul className="mt-4">
          {vpcs?.map((vpc) => (
            <li key={vpc.id} className="border-b py-2">
              <h3 className="font-semibold">{vpc.name}</h3>
              <p className="text-sm text-gray-500">Status: {vpc.status}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
