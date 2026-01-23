import { ResolverResult, withResolver } from "@/core/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/resolvers/resolver-base";
import resolvers from "@/dashboard/resolvers";

import ClientInitializer from "@/core/components/client-initializer";
import HomeDetails from "@/dashboard/components/home-details";

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, zones, workers, bits, breadcrumbNodes } = data;

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
          bits,
        }}
      />
      <HomeDetails />
    </>
  );
}

export default withResolver(resolvers)(Page);
