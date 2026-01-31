import { container } from "@/libs/container";
import MeshRepositoryImpl from "./data/repositories_impl/meshRepositoryImpl";
import MeshRepository from "./domain/repositories/meshRepository";
import { MeshService } from "./presentation/services/meshService";

container.register<MeshRepository>(
  "MeshRepository",
  () => new MeshRepositoryImpl()
);

container.register<MeshService>("MeshService", () => {
  const meshRepository = container.resolve<MeshRepository>("MeshRepository");
  return new MeshService(meshRepository);
});
