import {
  ResolverResult,
  withResolver,
} from "@/core/presentation/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/presentation/resolvers/resolver-base";
import resolvers from "@/dashboard/orbit/presentation/resolvers";

import ClientInitializer from "@/core/presentation/components/client-initializer";
import PortalsList from "@/dashboard/orbit/presentation/components/portalsList";

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, portals, portalTypes, breadcrumbNodes, title, subtitle } = data;

  return (
    <>
      <ClientInitializer
        store="layout"
        props={{
          breadcrumbNodes,
          title,
          subtitle,
        }}
      />
      <ClientInitializer
        store="app"
        props={{
          user,
          portals,
        }}
      />
      <PortalsList portalTypes={portalTypes} />
    </>
  );
}

export default withResolver(resolvers)(Page);
