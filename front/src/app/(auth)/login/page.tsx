import { ResolverResult, withResolver } from "@/core/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/resolvers/resolver-base";
import resolvers from "@/auth/login/resolvers";

import ClientInitializer from "@/core/components/client-initializer";
import LoginForm from "@/auth/login/components/login-form";

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user } = data;

  return (
    <>
      <ClientInitializer
        store="app"
        props={{
          user,
        }}
      />
      <LoginForm />
    </>
  );
}

export default withResolver(resolvers)(Page);
