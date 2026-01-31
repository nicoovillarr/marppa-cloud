import { container } from "@/libs/container";
import OrbitService from "./presentation/services/orbitService";
import OrbitRepository from "./domain/repositories/orbitRepository";
import OrbitRepositoryImpl from "./data/repositories_impl/orbitRepositoryImpl";

container.register<OrbitRepository>(
  "OrbitRepository",
  () => new OrbitRepositoryImpl()
);

container.register<OrbitService>("OrbitService", () => {
  const orbitRepository = container.resolve<OrbitRepository>("OrbitRepository");
  return new OrbitService(orbitRepository);
});
