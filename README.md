<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<div align="center" style="margin-top:50px">
  <img src="https://avatars.githubusercontent.com/u/165751591?s=200&v=4" height="150">
</div>
<!-- markdownlint-restore -->
<!-- prettier-ignore-end --> 

# Re7 Labs

Starknet Re7 Labs is a platform that allows users to better navigate DeFi on Starknet. It has the following features:  
1. Show top yield generating pools sorted by Protocols and various Categories. 10+ Protocols are integrated. ✅
2. Customized strategies, providing one-click investment with automated risk-management ✅ (Adding more)
3. Concentrated Liquidity Impermanent calculator 🚧
4. One click $STRK claim for DeFi spring users 🚧

## Project structure
The project is build using NextJS and Typescript. Below is the broad project structure:  
1. Re-usable project wide components go into `src/components`. Page specific components go into their respective folder. (e.g. `src/app/claims/components`)
2. We use [Jotai](https://jotai.org/) for state management. Atoms are written in `src/store`. E.g. `src/store/strategies.atoms.ts`.
   Most re-usable data is written into atoms, outside components so that data is eaily accessible across components without dumping custom logic into components.
   Its suggested to keep view components low on business logic code.
3. All protocols have a class object (e.g. `src/store/ekubo.store.ts`). Where protocol specific custom logic is written, so that its get written to respective Atoms.
4. You can use `src/store/IDapp.store.ts` to define abstract class or type definitions that can be used within protocol class objects.
5. Custom re-usable hooks are written to `src/hooks`.

## How to get started

[![Pull Requests welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg?style=flat-square)](https://github.com/solvedefi/starknet-re7-labs-app/issues)
Requirements:
1. Node 20+

Clone the repository
```bash
git clone https://github.com/solvedefi/starknet-re7-labs-app.git
```

Configure the environment. Ensure env file has necessary settings.
```
cp .env.sample .env.local
```

Install dependencies and run the development build

```bash
yarn
yarn run dev
```

You should see something like this:

```sh
> next dev

   ▲ Next.js 14.1.0
   - Local:        http://localhost:3000
   - Environments: .env

 ✓ Ready in 1431ms
```


## References

- [Website](https://re7labs.xyz/)
