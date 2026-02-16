import { ResolverResult, withResolver } from "@/core/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/resolvers/resolver-base";
import resolvers from "@/dashboard/nibble/resolvers";

import ClientInitializer from "@/core/presentation/components/client-initializer";
import BitsList from "@/dashboard/nibble/components/bits-list";

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
      <BitsList />
    </>
  );
}

export default withResolver(resolvers)(Page);
