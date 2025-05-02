import { useEffect, createRef } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
/*  Might require extra configuration,
see https://webpack.js.org/loaders/sass-loader/ for example.
create-react-app should support this natively. */
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { ChainResult, ProcessedResult } from "../AnalyticalPage";

declare global {
	interface Window {
		molstar?: PluginUIContext;
	}
}

type Props = {
	chainResult: ChainResult;
	selectedStructureUrls: string[];
};

export function MolStarWrapper({ chainResult, selectedStructureUrls }: Props) {
	const querySequenceUrl = getQuerySequenceUrl(chainResult);
	let tmp = [querySequenceUrl, ...selectedStructureUrls]
	const pdbUrls = tmp.map(x => x.replace("apache", "localhost")); // TODO: Delete map with replace

	if (pdbUrls.length === 0) {
		// At least one structure is always expected, but this check is added as a defensive programming measure.
		return <div>No structures provided.</div>
	}
	const parent = createRef<HTMLDivElement>();

	// In debug mode of react's strict mode, this code will
	// be called twice in a row, which might result in unexpected behavior.
	useEffect(() => {
		async function init() {
			const plugin = await createPluginUI({
				target: parent.current,
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

			window.molstar = plugin;

			await visualiseStructures(plugin, pdbUrls);
		}

		init();

		return () => {
			window.molstar?.dispose();
			window.molstar = undefined;
		};
	}, []);

	useEffect(() => {
		const plugin: PluginUIContext = window.molstar;
		if (!plugin) {
			return;
		}

		visualiseStructures(plugin, pdbUrls);
	}, [/*chainResult, */selectedStructureUrls]); // TODO

	return (
		<div ref={parent} style={{ position: "relative", height: "70vh", width: "45vw" }}></div>
	);

	function getQuerySequenceUrl(chainResult: ChainResult) {
		const dseResults = Object.values(chainResult.dataSourceExecutorResults) as ProcessedResult[];
		if (dseResults.length === 0) {
			/* No query sequence pdb url, this should not happen. */
			throw new Error("No query sequence url."); // TODO
		}

		// For all results should be query seq pdb url the same, we take the one at index 0
		const querySequenceUrl = dseResults[0].pdbUrl;
		return querySequenceUrl;
	}

	async function visualiseStructures(plugin: PluginUIContext, pdbUrls: string[]) {
		await plugin.clear();

		for (const url of pdbUrls) {
			const data = await window.molstar.builders.data.download(
				{ url: url },
				{ state: { isGhost: true } }
			);

			const trajectory = await window.molstar.builders.structure.parseTrajectory(data, "pdb");

			await window.molstar.builders.structure.hierarchy.applyPreset(trajectory, "default");
		}
	}
}
