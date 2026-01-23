import { ResolverResult, withResolver } from "@/core/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/resolvers/resolver-base";
import resolvers from "@/home/resolvers";

import ClientInitializer from "@/core/components/client-initializer";
import HomeLanding from "@/home/components/home-landing";

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user } = data;

  return (
    <>
      <ClientInitializer
        store="layout"
        props={{
          breadcrumbNodes: [],
        }}
      />
      <ClientInitializer
        store="app"
        props={{
          user,
        }}
      />
      <HomeLanding />
    </>
  );
}

export default withResolver(resolvers)(Page);
