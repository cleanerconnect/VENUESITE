// Where the acceptance tools get their browser.
//
// Playwright is deliberately not a dependency of the portal: the product
// does not use it, and putting it in `devDependencies` would make
// `npm install` download a browser for everyone who only wants to run
// the portal — which is the first promise the README makes. So the tools
// ask for it here, and `docs/HANDOFF.md` §3 says the one command that
// installs it.
//
// The point of this file is the message. A bare `import { chromium } from
// "playwright"` throws `ERR_MODULE_NOT_FOUND` with a Node stack trace
// before a single line of the tool runs, which reads like the tool is
// broken. It is not: it is one `npm install` away.

export async function chromiumOrExplain() {
  try {
    const { chromium } = await import("playwright");
    return chromium;
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    console.error(
      "Playwright n'est pas installé, et les outils de recette pilotent un\n" +
        "vrai navigateur. Une seule commande, une seule fois :\n" +
        "\n  npm install --no-save playwright\n" +
        "\nIl est tenu hors de `package.json` exprès : le portail ne s'en sert\n" +
        "pas, et `npm install` n'a pas à télécharger un navigateur pour qui\n" +
        "veut seulement lancer le portail. Voir `docs/HANDOFF.md` § 3.",
    );
    process.exit(1);
  }
}

/** The whole module, for the two tools that also need `devices`. */
export async function playwrightOrExplain() {
  const chromium = await chromiumOrExplain();
  const playwright = await import("playwright");
  return { ...playwright, chromium };
}
