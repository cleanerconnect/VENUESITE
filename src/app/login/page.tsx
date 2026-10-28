import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInPanel } from "./SignInPanel";

// The entry point.
//
// A partner arrives here from the Org button on lyfemaroc.org. One form,
// one set of credentials; where they land is resolved from the account,
// not from which link they followed.
//
// The left panel used to sell the platform — stat tiles, a festival
// testimonial, "le système d'exploitation de vos soirées". None of that
// is addressed to someone who already signed with LYFE and is opening
// the portal to run tonight's service. It is now the mark, one sentence
// about what is behind the form, and the country — and since there are
// three door screens it lives in `AuthShell`, which is where the
// reasoning for every class in it moved with it.
//
// The form is the whole of it: an address and a password. There is no
// account list to pick from, no guest entry and no demo shortcut — every
// one of those is a way into the portal that does not exist in
// production, and a reviewer who uses one is not reviewing the product.

export const metadata: Metadata = { title: "Connexion · LYFE" };

export default function LoginPage() {
  return (
    <AuthShell>
      {/* The panel reads `?expired=1`, so it needs a boundary for the
          static shell to render around. */}
      <Suspense fallback={<div className="w-full max-w-[400px] h-[420px]" />}>
        <SignInPanel />
      </Suspense>
    </AuthShell>
  );
}
