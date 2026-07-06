# Calibre Bridge

Plugin pro [Obsidian](https://obsidian.md), který propojí tvou [Calibre](https://calibre-ebook.com) knihovnu s Obsidianem. Jedním příkazem importuje vybrané knihy — každá dostane vlastní poznámku s obálkou, popisem a metadaty (série, hodnocení, tagy…).

Re-import je bezpečný: tvoje poznámky a stav čtení zůstanou nedotčené, aktualizují se jen data z Calibre.

---

## Co plugin dělá

Pro každou importovanou knihu vytvoří poznámku v Obsidianu:

- **Frontmatter** s metadaty: titul, autoři, série, hodnocení, tagy, ISBN, datum přidání…
- **Obálka** (stažená z Calibre serveru)
- **Popis knihy** (z Calibre, převedený do Markdownu)
- **Tvůj prostor** pod popisem — sem si piš co chceš, plugin se tam nikdy nedotkne

Stav čtení (`status`, `date_started`, `date_finished`) si nastavuješ sám a re-import ho nepřepíše.

---

## Požadavky

- Calibre 5.0 nebo novější
- Obsidian 1.6 nebo novější
- Funguje pouze na desktopu (Windows, macOS, Linux)

---

## Krok 1: Spusť Content Server v Calibre

Calibre má zabudovaný HTTP server, přes který plugin čte data. Musí běžet vždy, když chceš importovat.

**Spuštění:** V Calibre klikni na **Connect/share → Start Content Server**.

![Spuštění Content Serveru](https://user-images.githubusercontent.com/150803/143490663-afc3b418-a36e-422a-bab7-97b09237b507.png)

Server poběží na portu **8080** (pokud nezměníš). Adresa bude vypadat nějak takto: `http://192.168.1.10:8080` — IP adresu svého počítače najdeš v nastavení Calibre nebo v systémových nastaveních sítě.

**Trvalé spuštění:** Pokud chceš, aby server startoval automaticky s Calibre, jdi do **Preferences → Sharing → Sharing over the net** a zaškrtni *Start the Content server automatically at startup*.

### Přístup přes heslo (volitelné)

Pokud je Calibre dostupný z internetu nebo ho sdílíš s někým, kdo přístup mít nemá, doporučuji nastavit heslo: **Preferences → Sharing → Sharing over the net → Require username and password**.

---

## Krok 2: Nainstaluj plugin

1. Stáhni `main.js`, `styles.css` a `manifest.json` z [nejnovějšího release](../../releases/latest).
2. V souborovém manažeru přejdi do svého vaultu a otevři skrytou složku `.obsidian/plugins/`.
3. Vytvoř tam novou složku `calibre-bridge`.
4. Zkopíruj stažené soubory do té složky.
5. V Obsidianu jdi do **Settings → Community plugins**, klikni na **Reload** a zapni **Calibre Bridge**.

---

## Krok 3: Nastav plugin

Jdi do **Settings → Calibre Bridge**.

**Server URL** — zadej adresu svého Calibre serveru, např. `http://192.168.1.10:8080`. Pokud k Calibre přistupuješ přes Tailscale nebo jiný VPN, použij tu příslušnou IP.

**Username / Password** — vyplň jen pokud jsi v Calibre nastavil přihlášení.

**Library** — po zadání URL se knihovny načtou automaticky. Pokud máš víc knihoven, vyber správnou z nabídky.

**Book folder** a **Cover folder** — kam se mají ukládat poznámky a obálky. Defaultně `Books` a `Books/covers`.

---

## Krok 4: Importuj knihy

1. Otevři příkazovou paletu (`Cmd+P` na Macu, `Ctrl+P` na Windows/Linux).
2. Spusť příkaz **Calibre Bridge: Import books from Calibre**.
3. Zobrazí se seznam všech knih z Calibre — hledej podle názvu nebo autora.
4. Vyber knihy, které chceš importovat (kliknutí na řádek nebo zaškrtávátko).
5. Klikni na **Import N books**.

Hotovo — poznámky se vytvoří ve složce `Books`.

### Re-import

Pokud v Calibre aktualizuješ metadata nebo chceš obnovit popis, stačí spustit import znovu. Plugin pozná, které knihy už importované jsou, a jen je aktualizuje. Tvůj stav čtení a poznámky zůstanou.

---

## Přehled knihovny (Obsidian Bases)

V repozitáři je soubor `Library.base` — zkopíruj ho do svého vaultu a dostaneš přehlednou tabulku všech importovaných knih s pěti záložkami:

| Záložka | Obsah |
|---|---|
| Všechny knihy | Celá knihovna, seřazená podle data přidání |
| Čtu | Knihy se stavem `reading` |
| Nepřečtené | Knihy se stavem `unread` |
| Přečtené | Knihy se stavem `read` |
| Nedočtené | Knihy se stavem `did-not-finish` |

Stav čtení nastavíš přímo ve frontmatter poznámky — pole `status`. Platné hodnoty jsou `unread`, `reading`, `read`, `did-not-finish`.

---

## Licence

MIT
