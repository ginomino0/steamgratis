# SteamGratis

App che mostra i giochi Steam gratuiti e le promozioni a tempo, con possibilità
di segnare i giochi già presi (salvato solo nel tuo browser/telefono, nessun
account richiesto). Cliccando su un gioco si apre la sua pagina Steam: se hai
l'app Steam installata (PC o telefono), si apre direttamente lì con il tuo
account già collegato.

## Sviluppo locale
npm install
npm run dev
Apri http://localhost:8080

## Build di produzione
npm run build

## Deploy consigliato: Vercel
Questo progetto usa TanStack Start (React con parte server), quindi ha bisogno
di un piccolo server sempre attivo per andare a leggere i dati da Steam.
Vercel offre un piano gratuito pensato apposta per questo tipo di app:

1. Crea un repository su GitHub e carica questi file.
2. Vai su vercel.com, "Add New Project", collega il tuo account GitHub e
   scegli il repository appena creato.
3. Vercel riconosce automaticamente il progetto (preset "vercel" già
   configurato) e lo pubblica con un link tipo https://tuo-progetto.vercel.app

## Installarla come app sul telefono (PWA)
Una volta pubblicata su Vercel, apri il link dal telefono con Chrome (Android)
o Safari (iPhone) e scegli "Aggiungi a schermata Home" / "Installa app".
Si comporterà come un'app vera, con la sua icona, senza barra del browser.
