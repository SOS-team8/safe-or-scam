"use client";
import { r as __toESM, t as require_react } from "./react-DTjSBzeh.js";
import { B as onlineManager, C as useQueryClient, w as require_jsx_runtime } from "./modern-DXlNY56W.js";
import { G as setupStyleSheet, I as mergeProps, P as lazy, V as render, m as createComponent, x as createSignal } from "./Q7GRFEEB-I4HJ1NVO.js";
//#region node_modules/@tanstack/query-devtools/build/dev.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var TanstackQueryDevtools = class {
	#client;
	#onlineManager;
	#queryFlavor;
	#version;
	#isMounted = false;
	#styleNonce;
	#shadowDOMTarget;
	#buttonPosition;
	#position;
	#initialIsOpen;
	#errorTypes;
	#hideDisabledQueries;
	#Component;
	#theme;
	#dispose;
	constructor(config) {
		const { client, queryFlavor, version, onlineManager, buttonPosition, position, initialIsOpen, errorTypes, styleNonce, shadowDOMTarget, hideDisabledQueries, theme } = config;
		this.#client = createSignal(client);
		this.#queryFlavor = queryFlavor;
		this.#version = version;
		this.#onlineManager = onlineManager;
		this.#styleNonce = styleNonce;
		this.#shadowDOMTarget = shadowDOMTarget;
		this.#buttonPosition = createSignal(buttonPosition);
		this.#position = createSignal(position);
		this.#initialIsOpen = createSignal(initialIsOpen);
		this.#errorTypes = createSignal(errorTypes);
		this.#hideDisabledQueries = createSignal(hideDisabledQueries);
		this.#theme = createSignal(theme);
	}
	setButtonPosition(position) {
		this.#buttonPosition[1](position);
	}
	setPosition(position) {
		this.#position[1](position);
	}
	setInitialIsOpen(isOpen) {
		this.#initialIsOpen[1](isOpen);
	}
	setErrorTypes(errorTypes) {
		this.#errorTypes[1](errorTypes);
	}
	setClient(client) {
		this.#client[1](client);
	}
	setTheme(theme) {
		this.#theme[1](theme);
	}
	mount(el) {
		if (this.#isMounted) throw new Error("Devtools is already mounted");
		const dispose = render(() => {
			const _self$ = this;
			const [btnPosition] = this.#buttonPosition;
			const [pos] = this.#position;
			const [isOpen] = this.#initialIsOpen;
			const [errors] = this.#errorTypes;
			const [hideDisabledQueries] = this.#hideDisabledQueries;
			const [queryClient] = this.#client;
			const [theme] = this.#theme;
			let Devtools;
			if (this.#Component) Devtools = this.#Component;
			else {
				Devtools = lazy(() => import("./VKXKX7EQ-DwXMHGLd.js"));
				this.#Component = Devtools;
			}
			setupStyleSheet(this.#styleNonce, this.#shadowDOMTarget);
			return createComponent(Devtools, mergeProps({
				get queryFlavor() {
					return _self$.#queryFlavor;
				},
				get version() {
					return _self$.#version;
				},
				get onlineManager() {
					return _self$.#onlineManager;
				},
				get shadowDOMTarget() {
					return _self$.#shadowDOMTarget;
				}
			}, {
				get client() {
					return queryClient();
				},
				get buttonPosition() {
					return btnPosition();
				},
				get position() {
					return pos();
				},
				get initialIsOpen() {
					return isOpen();
				},
				get errorTypes() {
					return errors();
				},
				get hideDisabledQueries() {
					return hideDisabledQueries();
				},
				get theme() {
					return theme();
				}
			}));
		}, el);
		this.#isMounted = true;
		this.#dispose = dispose;
	}
	unmount() {
		if (!this.#isMounted) throw new Error("Devtools is not mounted");
		this.#dispose?.();
		this.#isMounted = false;
	}
};
var TanstackQueryDevtoolsPanel = class {
	#client;
	#onlineManager;
	#queryFlavor;
	#version;
	#isMounted = false;
	#styleNonce;
	#shadowDOMTarget;
	#buttonPosition;
	#position;
	#initialIsOpen;
	#errorTypes;
	#hideDisabledQueries;
	#onClose;
	#Component;
	#theme;
	#dispose;
	constructor(config) {
		const { client, queryFlavor, version, onlineManager, buttonPosition, position, initialIsOpen, errorTypes, styleNonce, shadowDOMTarget, onClose, hideDisabledQueries, theme } = config;
		this.#client = createSignal(client);
		this.#queryFlavor = queryFlavor;
		this.#version = version;
		this.#onlineManager = onlineManager;
		this.#styleNonce = styleNonce;
		this.#shadowDOMTarget = shadowDOMTarget;
		this.#buttonPosition = createSignal(buttonPosition);
		this.#position = createSignal(position);
		this.#initialIsOpen = createSignal(initialIsOpen);
		this.#errorTypes = createSignal(errorTypes);
		this.#hideDisabledQueries = createSignal(hideDisabledQueries);
		this.#onClose = createSignal(onClose);
		this.#theme = createSignal(theme);
	}
	setButtonPosition(position) {
		this.#buttonPosition[1](position);
	}
	setPosition(position) {
		this.#position[1](position);
	}
	setInitialIsOpen(isOpen) {
		this.#initialIsOpen[1](isOpen);
	}
	setErrorTypes(errorTypes) {
		this.#errorTypes[1](errorTypes);
	}
	setClient(client) {
		this.#client[1](client);
	}
	setOnClose(onClose) {
		this.#onClose[1](() => onClose);
	}
	setTheme(theme) {
		this.#theme[1](theme);
	}
	mount(el) {
		if (this.#isMounted) throw new Error("Devtools is already mounted");
		const dispose = render(() => {
			const _self$ = this;
			const [btnPosition] = this.#buttonPosition;
			const [pos] = this.#position;
			const [isOpen] = this.#initialIsOpen;
			const [errors] = this.#errorTypes;
			const [hideDisabledQueries] = this.#hideDisabledQueries;
			const [queryClient] = this.#client;
			const [onClose] = this.#onClose;
			const [theme] = this.#theme;
			let Devtools;
			if (this.#Component) Devtools = this.#Component;
			else {
				Devtools = lazy(() => import("./ZUJJ2RGI-B4NUGDZ3.js"));
				this.#Component = Devtools;
			}
			setupStyleSheet(this.#styleNonce, this.#shadowDOMTarget);
			return createComponent(Devtools, mergeProps({
				get queryFlavor() {
					return _self$.#queryFlavor;
				},
				get version() {
					return _self$.#version;
				},
				get onlineManager() {
					return _self$.#onlineManager;
				},
				get shadowDOMTarget() {
					return _self$.#shadowDOMTarget;
				}
			}, {
				get client() {
					return queryClient();
				},
				get buttonPosition() {
					return btnPosition();
				},
				get position() {
					return pos();
				},
				get initialIsOpen() {
					return isOpen();
				},
				get errorTypes() {
					return errors();
				},
				get hideDisabledQueries() {
					return hideDisabledQueries();
				},
				get onClose() {
					return onClose();
				},
				get theme() {
					return theme();
				}
			}));
		}, el);
		this.#isMounted = true;
		this.#dispose = dispose;
	}
	unmount() {
		if (!this.#isMounted) throw new Error("Devtools is not mounted");
		this.#dispose?.();
		this.#isMounted = false;
	}
};
//#endregion
//#region node_modules/@tanstack/react-query-devtools/build/modern/ReactQueryDevtools.js
var import_jsx_runtime = require_jsx_runtime();
function ReactQueryDevtools(props) {
	const queryClient = useQueryClient(props.client);
	const ref = import_react.useRef(null);
	const { buttonPosition, position, initialIsOpen, errorTypes, styleNonce, shadowDOMTarget, hideDisabledQueries, theme } = props;
	const [devtools] = import_react.useState(new TanstackQueryDevtools({
		client: queryClient,
		queryFlavor: "React Query",
		version: "5",
		onlineManager,
		buttonPosition,
		position,
		initialIsOpen,
		errorTypes,
		styleNonce,
		shadowDOMTarget,
		hideDisabledQueries,
		theme
	}));
	import_react.useEffect(() => {
		devtools.setClient(queryClient);
	}, [queryClient, devtools]);
	import_react.useEffect(() => {
		if (buttonPosition) devtools.setButtonPosition(buttonPosition);
	}, [buttonPosition, devtools]);
	import_react.useEffect(() => {
		if (position) devtools.setPosition(position);
	}, [position, devtools]);
	import_react.useEffect(() => {
		devtools.setInitialIsOpen(initialIsOpen || false);
	}, [initialIsOpen, devtools]);
	import_react.useEffect(() => {
		devtools.setErrorTypes(errorTypes || []);
	}, [errorTypes, devtools]);
	import_react.useEffect(() => {
		devtools.setTheme(theme);
	}, [theme, devtools]);
	import_react.useEffect(() => {
		if (ref.current) devtools.mount(ref.current);
		return () => {
			devtools.unmount();
		};
	}, [devtools]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		dir: "ltr",
		className: "tsqd-parent-container",
		ref
	});
}
//#endregion
//#region node_modules/@tanstack/react-query-devtools/build/modern/ReactQueryDevtoolsPanel.js
function ReactQueryDevtoolsPanel(props) {
	const queryClient = useQueryClient(props.client);
	const ref = import_react.useRef(null);
	const { errorTypes, styleNonce, shadowDOMTarget, hideDisabledQueries, theme } = props;
	const [devtools] = import_react.useState(new TanstackQueryDevtoolsPanel({
		client: queryClient,
		queryFlavor: "React Query",
		version: "5",
		onlineManager,
		buttonPosition: "bottom-left",
		position: "bottom",
		initialIsOpen: true,
		errorTypes,
		styleNonce,
		shadowDOMTarget,
		onClose: props.onClose,
		hideDisabledQueries,
		theme
	}));
	import_react.useEffect(() => {
		devtools.setClient(queryClient);
	}, [queryClient, devtools]);
	import_react.useEffect(() => {
		devtools.setOnClose(props.onClose ?? (() => {}));
	}, [props.onClose, devtools]);
	import_react.useEffect(() => {
		devtools.setErrorTypes(errorTypes || []);
	}, [errorTypes, devtools]);
	import_react.useEffect(() => {
		devtools.setTheme(theme);
	}, [theme, devtools]);
	import_react.useEffect(() => {
		if (ref.current) devtools.mount(ref.current);
		return () => {
			devtools.unmount();
		};
	}, [devtools]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: {
			height: "500px",
			...props.style
		},
		className: "tsqd-parent-container",
		ref
	});
}
//#endregion
//#region node_modules/@tanstack/react-query-devtools/build/modern/index.js
var ReactQueryDevtools2 = ReactQueryDevtools;
var ReactQueryDevtoolsPanel2 = ReactQueryDevtoolsPanel;
//#endregion
export { ReactQueryDevtools2 as ReactQueryDevtools, ReactQueryDevtoolsPanel2 as ReactQueryDevtoolsPanel };

//# sourceMappingURL=@tanstack_react-query-devtools.js.map