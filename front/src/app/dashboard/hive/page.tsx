import { ResolverResult, withResolver } from "@/core/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/resolvers/resolver-base";
import resolvers from "@/dashboard/hive/resolvers";

import ClientInitializer from "@/core/components/client-initializer";
import WorkersList from "@/dashboard/hive/components/workers-list";

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, zones, workers, breadcrumbNodes } = data;

  return (
    <>
      <ClientInitializer
        store="layout"
        props={{
          breadcrumbNodes,
        }}
      />
      <ClientInitializer
        store="app"
        props={{
          user,
          zones,
          workers,
        }}
      />
      <WorkersList />
    </>
  );
}

export default withResolver(resolvers)(Page);
