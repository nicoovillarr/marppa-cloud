import { ResolverResult, withResolver } from "@/core/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/resolvers/resolver-base";
import resolvers from "@/dashboard/mesh/resolvers";

import ClientInitializer from "@/core/components/client-initializer";
import NodesList from "@/dashboard/mesh/components/nodes-list";

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, vpcs, breadcrumbNodes } = data;

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
          vpcs,
        }}
      />
      <NodesList />
    </>
  );
}

export default withResolver(resolvers)(Page);
