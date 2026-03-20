
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/mascotas"
  },
  {
    "renderMode": 2,
    "route": "/mascotas/crear"
  },
  {
    "renderMode": 0,
    "route": "/mascotas/editar/*"
  },
  {
    "renderMode": 0,
    "route": "/mascotas/historial/*"
  },
  {
    "renderMode": 2,
    "route": "/duenos"
  },
  {
    "renderMode": 2,
    "route": "/duenos/crear"
  },
  {
    "renderMode": 0,
    "route": "/duenos/editar/*"
  },
  {
    "renderMode": 2,
    "route": "/citas"
  },
  {
    "renderMode": 2,
    "route": "/citas/crear"
  },
  {
    "renderMode": 0,
    "route": "/citas/editar/*"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 651, hash: '5d9c73858b1f4b8cc508b45ac84b4dfde665c4dcf1c5d81b9659c20a3f33c1ba', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 945, hash: '95290bc057d2fc6372ccf180a5a4c6e554c554a8e77b90717c73c8c15dcc8e52', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'mascotas/index.html': {size: 14846, hash: '7147ac301fb99290265db8c15029eb13d0c0bb8124b58bc6a23cd856c2e9087e', text: () => import('./assets-chunks/mascotas_index_html.mjs').then(m => m.default)},
    'citas/index.html': {size: 14190, hash: 'a479eb5957b93b06e8afc044214afcb0d1508440e3e46e644a2a68ca6fc337c2', text: () => import('./assets-chunks/citas_index_html.mjs').then(m => m.default)},
    'mascotas/crear/index.html': {size: 10553, hash: '7b831c2da2c3296f5d8088b47ef5244f47daf92fdc43a487ff251ce2ac6c0f3b', text: () => import('./assets-chunks/mascotas_crear_index_html.mjs').then(m => m.default)},
    'duenos/crear/index.html': {size: 10478, hash: '18d1a38872a555a401cdc74a025aab7f9aa9130bc3a3d9d317ce0f83afb3280f', text: () => import('./assets-chunks/duenos_crear_index_html.mjs').then(m => m.default)},
    'citas/crear/index.html': {size: 13638, hash: '54663582a8460869cc1dcee6c6508ee274ab174e5bc87e597c59c9f8830075ec', text: () => import('./assets-chunks/citas_crear_index_html.mjs').then(m => m.default)},
    'index.html': {size: 28659, hash: '0ece5340dc22ecb94696cd7debf5695a541677432c08293ddcc4918adbe562fc', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'duenos/index.html': {size: 13026, hash: '2d91d66593e8f206c08964b535a97637659c050132cbbcc53fa1715e47b44997', text: () => import('./assets-chunks/duenos_index_html.mjs').then(m => m.default)},
    'styles-VNXS76RU.css': {size: 94, hash: 'xnrhhXYzEow', text: () => import('./assets-chunks/styles-VNXS76RU_css.mjs').then(m => m.default)}
  },
};
