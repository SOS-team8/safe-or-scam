import { O as getPreferredColorScheme, m as createComponent, v as createMemo } from "./Q7GRFEEB-I4HJ1NVO.js";
import { a as QueryDevtoolsContext, c as createLocalStorage, i as PiPProvider, n as Devtools, s as ThemeContext } from "./S7NCRHOU-KVTWodEC.js";
//#region node_modules/@tanstack/query-devtools/build/DevtoolsComponent/VKXKX7EQ.js
var DevtoolsComponent = (props) => {
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
				localStore,
				setLocalStore,
				get children() {
					return createComponent(ThemeContext.Provider, {
						value: theme,
						get children() {
							return createComponent(Devtools, {
								localStore,
								setLocalStore
							});
						}
					});
				}
			});
		}
	});
};
var DevtoolsComponent_default = DevtoolsComponent;
//#endregion
export { DevtoolsComponent_default as default };

//# sourceMappingURL=VKXKX7EQ-DwXMHGLd.js.map