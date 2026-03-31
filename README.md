# VLAH Consultant Hub

Lokalni Next.js prototype za konsultantski CRM:

- baza klijenata
- automatski generisan journey iz programa
- consultant view sa dodeljenim klijentima
- istorija sastanaka, akcije i dokumentacija
- demo AI summary workflow za meeting notes

## Pokretanje

```bash
npm install
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000).

## Glavne rute

- `/` dashboard
- `/clients` baza klijenata
- `/clients/[clientId]` detaljan profil klijenta
- `/api/meeting-summary` demo API za summary generator

## Trenutno stanje

Ova verzija koristi mock podatke i nema bazu ni login. Namerno je napravljena kao klikabilan MVP da prvo zakljucamo proizvodnu logiku pre Neon/Vercel/OpenAI integracije.

## Sledeca faza

1. Neon schema za klijente, programe, sastanke i action items.
2. Auth i role-based pristup za konsultante i admin.
3. Storage za audio/video recordings i dokumente.
4. OpenAI transkripcija audio fajla i strukturisani summary po sastanku.
5. Vercel deploy na subdomain.
