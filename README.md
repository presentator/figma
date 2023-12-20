Presentator Figma plugin
======================================================================

<p align="center"><img src="https://i.imgur.com/IkmlJnm.png" alt="Plugin screenshots"></p>

Figma plugin to export design frames directly to Presentator v2 and v3.

OAuth2 authentication is supported only with Presentator v3.

- [Installing](#installing)
- [Development](#development)


## Installing

#### From Figma Plugins Page

Visit https://www.figma.com/community/plugin/791989050714284849/presentator-export and click "Open in Figma".

#### Manually

1. Download or clone the plugin repo.

2. Go to _Plugins > Manage plugins > New plugin (+) > Import plugin from manifest_ and select the `manifest.json` file of the plugin.


## Development

The plugin is consisted of 2 parts:
- Figma plugin initialization code located in `src/figma.js`.
- Everything else is the plugin dialog UI.

1. Download or clone the plugin repo.

2. Run the appropriate console commands:

```bash
# installs dependencies
npm install

# starts a Vite dev server of the UI to preview in the browser
npm run dev

# builds both the UI and Figma plugin code in the dist directory
npm run build
```
