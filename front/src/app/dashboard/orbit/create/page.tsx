import {
  ResolverResult,
  withResolver,
} from "@/core/presentation/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/presentation/resolvers/resolver-base";

import ClientInitializer from "@/core/presentation/components/client-initializer";
import CreateDomain from "@/dashboard/orbit/presentation/components/createPortal";

import createPortalLayoutResolver from "@/dashboard/orbit/presentation/resolvers/create-portal-layout-resolver";
import createPortalResolver from "@/dashboard/orbit/presentation/resolvers/create-portal-resolver";

const resolvers = [createPortalLayoutResolver, createPortalResolver];

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, portals, portalTypes, breadcrumbNodes } = data;

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
          portals,
        }}
      />
      <CreateDomain portalTypes={portalTypes} />
    </>
  );
}

export default withResolver(resolvers)(Page);
