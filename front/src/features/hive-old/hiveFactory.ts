import { container } from "@/libs/container";
import HiveRepository from "./domain/repositories/hiveRepository";
import HiveRepositoryImpl from "./data/repositories_impl/hiveRepositoryImpl";
import { HiveService } from "./presentation/services/hiveService";

container.register<HiveRepository>(
  "HiveRepository",
  () => new HiveRepositoryImpl()
);

container.register<HiveService>("HiveService", () => {
  const hiveRepository = container.resolve<HiveRepository>("HiveRepository");
  return new HiveService(hiveRepository);
});
