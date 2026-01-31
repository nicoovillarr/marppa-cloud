import {
  ResolverResult,
  withResolver,
} from "@/core/presentation/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/presentation/resolvers/resolver-base";

import createWorkerLayoutResolver from "@/dashboard/hive/presentation/resolvers/create-worker-layout-resolver";
import createWorkerResolver from "@/dashboard/hive/presentation/resolvers/create-worker-resolver";

import ClientInitializer from "@/core/presentation/components/client-initializer";
import CreateWorkerForm from "@/dashboard/hive/presentation/components/create-worker-form";

const resolvers = [createWorkerLayoutResolver, createWorkerResolver];

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, workers, workerImages, workerMmi, breadcrumbNodes } = data;

  return (
    <>
      <ClientInitializer
        store="layout"
        props={{
          breadcrumbNodes,
          title: null,
          subtitle: null,
        }}
      />
      <ClientInitializer
        store="app"
        props={{
          user,
          workers,
          workerImages,
          workerMmi,
        }}
      />
      <CreateWorkerForm />
    </>
  );
}

export default withResolver(resolvers)(Page);
