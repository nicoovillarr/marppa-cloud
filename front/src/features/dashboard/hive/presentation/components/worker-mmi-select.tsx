import { useAppStore } from "@/libs/stores/app-store";
import { useShallow } from "zustand/shallow";

export default function WorkerMmiSelect() {
  const { workerMmi } = useAppStore(
    useShallow((state) => ({
      workerMmi: state.workerMmi,
    }))
  );
}
