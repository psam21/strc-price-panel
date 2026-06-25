# Stock Price Panel

A GNOME Shell extension that shows a live stock price in the top panel with full customization.

![GNOME Shell 48/49/50](https://img.shields.io/badge/GNOME%20Shell-48%2F49%2F50-blue)

## Features

- **Live price tracking** — displays the current price of any stock ticker
- **Multiple data sources** — Yahoo Finance (default), Finnhub, or a custom API URL
- **Color-coded movement** — green when up, red when down, gray when unchanged (all customizable)
- **Configurable display** — show/hide dollar change, percent change, movement arrow
- **Adjustable prefix** — `$`, `€`, `£`, or anything else
- **Position control** — place on left, center, or right of the top panel with ordering
- **Font size & decimal places** — fully adjustable
- **Preferences UI** — accessible via GNOME Extensions or `gnome-extensions prefs`

## Installation

### From source

```bash
git clone https://github.com/psam21/strc-price-panel.git
cd strc-price-panel
make install
```

Or manually:

```bash
# Copy to extensions directory
cp -r strc-price-panel \
  ~/.local/share/gnome-shell/extensions/strc-price-panel@custom.github.com

# Compile the GSettings schema
cd ~/.local/share/gnome-shell/extensions/strc-price-panel@custom.github.com
glib-compile-schemas schemas/

# Enable the extension
gnome-extensions enable strc-price-panel@custom.github.com

# Restart GNOME Shell
#   X11: Alt+F2 → type 'r' → Enter
#   Wayland: log out and log back in
```

### Dependencies

- GNOME Shell 48, 49, or 50
- `glib-compile-schemas` (usually installed with `glib2`)
- For Finnhub source: a free API key from [finnhub.io](https://finnhub.io)

## Usage

After installation, the default ticker is **STRC** (NASDAQ), refreshing every 60 seconds.

### Customizing

Open preferences via:

```bash
gnome-extensions prefs strc-price-panel@custom.github.com
```

Or open **GNOME Extensions** and click the gear icon next to Stock Price Panel.

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Ticker symbol | `STRC` | NASDAQ ticker to track |
| Data source | `Yahoo Finance` | `Yahoo Finance`, `Finnhub`, or `Custom URL` |
| Custom API URL | *(empty)* | When source = Custom, the URL to fetch (JSON with a `price` field) |
| Finnhub API key | *(empty)* | Required when source = Finnhub |
| Refresh interval | `60` seconds | How often to fetch (min 10, max 3600) |
| Price prefix | `$` | Text before the price |
| Decimal places | `2` | Number of decimals to show |
| Font size | `110%` | Relative to panel font |
| Show movement arrow | ✅ | Display ▲ / ▼ / – |
| Show dollar change | ✅ | Display `+$1.23` since last fetch |
| Show percent change | ❌ | Display `(+1.5%)` since last fetch |
| Color (up) | `#4ae24a` | CSS color for upward movement |
| Color (down) | `#ff5555` | CSS color for downward movement |
| Color (unchanged) | `#cccccc` | CSS color for no movement |
| Default text color | `#ffffff` | Base text color |
| Panel position | `right` | `left`, `center`, or `right` |
| Order within slot | `0` | Sort order within the position |

### Data sources

- **Yahoo Finance** — no API key required; uses the public v8 chart endpoint
- **Finnhub** — requires a free API key; uses `/api/v1/quote`
- **Custom URL** — GET the URL, parse `response.price` as a number

## Uninstall

```bash
gnome-extensions disable strc-price-panel@custom.github.com
rm -rf ~/.local/share/gnome-shell/extensions/strc-price-panel@custom.github.com
```

## Development

```bash
# Make changes, then reinstall and reload:
cp -r . ~/.local/share/gnome-shell/extensions/strc-price-panel@custom.github.com/
cd ~/.local/share/gnome-shell/extensions/strc-price-panel@custom.github.com
glib-compile-schemas schemas/
gnome-extensions disable strc-price-panel@custom.github.com && \
  gnome-extensions enable strc-price-panel@custom.github.com

# Watch logs:
journalctl --user -u gnome-shell --follow | grep strc-price
```

## License

MIT
