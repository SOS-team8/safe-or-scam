import { O as getPreferredColorScheme, m as createComponent, v as createMemo } from "./Q7GRFEEB-I4HJ1NVO.js";
import { a as QueryDevtoolsContext, c as createLocalStorage, i as PiPProvider, r as ParentPanel, s as ThemeContext, t as ContentView } from "./S7NCRHOU-KVTWodEC.js";
//#region node_modules/@tanstack/query-devtools/build/DevtoolsPanelComponent/ZUJJ2RGI.js
var DevtoolsPanelComponent = (props) => {
	const [localStore, setLocalStore] = createLocalStorage({ prefix: "TanstackQueryDevtools" });
	const colorScheme = getPreferredColorScheme();
	const theme = createMemo(() => {
		const preference = props.theme || localStore.theme_preference || "system";
		if (preference !== "system") return preference;
		return colorScheme();
	});
	return createComponent(QueryDevtoolsContext.Provider, {
		value: props,
		get children() {
			return createComponent(PiPProvider, {
				disabled: true,
				localStore,
				setLocalStore,
				get children() {
					return createComponent(ThemeContext.Provider, {
						value: theme,
						get children() {
							return createComponent(ParentPanel, { get children() {
								return createComponent(ContentView, {
									localStore,
									setLocalStore,
									get onClose() {
										return props.onClose;
									},
									showPanelViewOnly: true
								});
							} });
						}
					});
				}
			});
		}
	});
};
var DevtoolsPanelComponent_default = DevtoolsPanelComponent;
//#endregion
export { DevtoolsPanelComponent_default as default };

//# sourceMappingURL=ZUJJ2RGI-B4NUGDZ3.js.map