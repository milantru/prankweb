import { useEffect, createRef } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
/*  Might require extra configuration,
see https://webpack.js.org/loaders/sass-loader/ for example.
create-react-app should support this natively. */
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";

declare global {
  interface Window {
    molstar?: PluginUIContext;
  }
}


export function MolStarWrapper() {
  const parent = createRef<HTMLDivElement>();

  // In debug mode of react's strict mode, this code will
  // be called twice in a row, which might result in unexpected behavior.
  useEffect(() => {
    async function init() {
        window.molstar = await createPluginUI(
            {
                target: parent as unknown as HTMLElement,
                render: renderReact18,
                spec: {
                    ...DefaultPluginUISpec(),
                    layout: {
                        initial: {
                            isExpanded: false,
                            showControls: true,
                            controlsDisplay: "reactive",
                            regionState: {
                                top: "hidden",    //sequence
                                left: (window.innerWidth > 1200) ? "collapsed" : "hidden",
                                //tree with some components, hide for small and medium screens
                                bottom: "hidden", //shows log information
                                right: "hidden"   //structure tools
                            }
                        }
                    },
                    components: {
                        remoteState: 'none'
                    }
                }
            });

        const data = await window.molstar.builders.data.download(
          { url: "https://files.rcsb.org/download/3PTB.pdb" }, /* replace with your URL */
          { state: { isGhost: true } }
        );
        const trajectory =
          await window.molstar.builders.structure.parseTrajectory(data, "pdb");
        await window.molstar.builders.structure.hierarchy.applyPreset(
          trajectory,
          "default"
        );
    }
    init();
    return () => {
      window.molstar?.dispose();
      window.molstar = undefined;
    };
  }, []);

  return <div ref={parent} style={{ width: 640, height: 480 }}/>;
}
