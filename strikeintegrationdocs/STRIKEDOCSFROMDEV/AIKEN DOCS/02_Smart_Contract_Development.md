# 2. Smart Contract Development on Cardano

Developing smart contracts on Cardano for a dApp like NikePig involves specific languages, tools, and best practices. The Alonzo hard fork enabled this functionality, primarily through the Plutus Platform. <mcreference link="https://coinmarketcap.com/alexandria/article/a-deep-dive-into-the-cardano-alonzo-hard-fork" index="3">3</mcreference>

## 2.1. Plutus Platform

Plutus is Cardano's native smart contract development platform. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>

*   **Language:** Plutus Core is the low-level language executed on the blockchain. However, developers typically write Plutus contracts in Haskell, a functional programming language, which then compiles down to Plutus Core. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Functional Programming:** The use of Haskell encourages a declarative style and offers strong type safety, which can lead to more robust and secure contracts. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **On-Chain and Off-Chain Code:** Plutus development distinguishes between:
    *   **On-Chain Code (Validators):** These are the scripts that run on the blockchain to validate transactions. They are written in Plutus Core (compiled from Haskell). <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
    *   **Off-Chain Code:** This code runs outside the blockchain (e.g., in a user's wallet or on a server) to construct and submit transactions. It can also be written in Haskell using the Plutus Application Framework (PAF) or other libraries. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **eUTXO Model Integration:** Plutus contracts are designed to work with Cardano's eUTXO model. Validators lock UTXOs, and transactions spending these UTXOs must satisfy the conditions defined in the validator script. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>

For NikePig, the core game logic, prize distribution, and countdown mechanics will be implemented as Plutus smart contracts.

## 2.2. Marlowe

Marlowe is a domain-specific language (DSL) for writing financial smart contracts on Cardano. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>

*   **Target Audience:** Designed for subject-matter experts, business analysts, and developers who may not be Haskell experts. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Simplicity and Security:** Aims to simplify the creation of secure financial agreements. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Visual Programming:** Marlowe contracts can be built visually using tools like the Marlowe Playground. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Formal Verification:** Marlowe contracts are amenable to formal analysis, enhancing security. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>

While Plutus offers more general-purpose programmability, Marlowe might be suitable for specific, well-defined financial components within NikePig if its constraints align with the requirements. However, the complex game logic of NikePig likely necessitates the flexibility of Plutus.

## 2.3. Aiken

Aiken is a modern, purely functional programming language and toolkit specifically designed for writing on-chain smart contracts on Cardano. <mcreference link="https://aiken-lang.org/" index="4">4</mcreference> <mcreference link="https://docs.aiken-lang.org/" index="5">5</mcreference> It aims to provide an improved developer experience compared to Haskell/Plutus while still compiling to Untyped Plutus Core (UPLC) for execution on the Cardano blockchain. <mcreference link="https://aiken-lang.org/" index="4">4</mcreference> <mcreference link="https://cexplorer.io/article/aiken-vs-plutustx-a-new-era-for-cardano-smart-contracts" index="6">6</mcreference>

*   **Developer Experience:** Aiken focuses on providing helpful compiler feedback, a streamlined toolchain (including testing, documentation generation, and a language server), and a syntax that might be more familiar to developers coming from C-family languages. <mcreference link="https://aiken-lang.org/" index="4">4</mcreference> <mcreference link="https://docs.aiken-lang.org/" index="5">5</mcreference>
*   **Purely Functional:** Like Haskell, Aiken is a purely functional language, which can lead to more predictable and verifiable code. <mcreference link="https://aiken-lang.org/" index="4">4</mcreference>
*   **On-Chain Focus:** Aiken is primarily for writing the on-chain validator scripts. Off-chain code for transaction building and interaction would typically be written in other languages (e.g., JavaScript/TypeScript with libraries like Lucid or Mesh). <mcreference link="https://docs.aiken-lang.org/" index="5">5</mcreference>
*   **Tooling:** Comes with a comprehensive toolkit including `aiken check`, `aiken fmt`, `aiken build`, `aiken test`, and `aiken docs`. <mcreference link="https://aiken-lang.org/" index="4">4</mcreference> <mcreference link="https://docs.aiken-lang.org/" index="5">5</mcreference>
*   **Adoption:** Gaining traction within the Cardano ecosystem, with notable projects like SundaeSwap V2 and Jpg.store utilizing it for their smart contracts. <mcreference link="https://cexplorer.io/article/aiken-vs-plutustx-a-new-era-for-cardano-smart-contracts" index="6">6</mcreference>
*   **Performance:** Reports suggest Aiken can produce more optimized and performant UPLC compared to Plutus Tx in some cases. <mcreference link="https://cexplorer.io/article/aiken-vs-plutustx-a-new-era-for-cardano-smart-contracts" index="6">6</mcreference>
*   **Learning Curve:** While aiming for simplicity, a good understanding of Cardano's eUTXO model and functional programming concepts is still beneficial. <mcreference link="https://aiken-lang.org/" index="4">4</mcreference>

For NikePig, Aiken presents a viable and potentially more developer-friendly alternative to Plutus/Haskell for writing the on-chain smart contract logic, especially if the development team prefers its syntax and tooling. The choice between Plutus/Haskell and Aiken would depend on team expertise and project preferences.

## 2.4. Development Tools and Environment

*   **Plutus Playground:** A web-based environment for learning, writing, and simulating Plutus smart contracts without needing a full development setup. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Cardano CLI (Command Line Interface):** Essential for interacting with the Cardano network, managing addresses, creating transactions, and deploying/interacting with smart contracts. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Haskell Development Environment:** Requires GHC (Glasgow Haskell Compiler), Cabal (build tool), and HLS (Haskell Language Server) for a productive development experience.
*   **Emulators and Testnets:** Cardano provides emulators and public testnets for deploying and testing smart contracts in a simulated or live pre-production environment. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Lucid, Aiken, Mesh, etc.:** Higher-level SDKs and tools are emerging to simplify dApp development on Cardano, offering JavaScript/TypeScript interfaces for interacting with contracts and the blockchain.

## 2.5. Best Practices for Cardano Smart Contract Development

*   **Thorough Testing:** Given the immutability of blockchains, rigorous testing (unit, integration, property-based) is paramount.
*   **Code Audits:** Engage reputable firms (like Anastasia Labs, as mentioned in the NikePig brief) for security audits before mainnet deployment. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Simplicity:** Aim for the simplest possible logic that meets requirements to reduce the attack surface.
*   **Modularity:** Break down complex contracts into smaller, manageable, and testable components.
*   **Handle Edge Cases:** Consider all possible states and inputs, especially unexpected ones.
*   **Gas Optimization (Transaction Fees):** While Cardano's fee structure differs from Ethereum's gas model, efficient contract design is still important to minimize transaction costs for users. This involves optimizing script size and computational steps.
*   **State Management:** Carefully design how state is managed within the eUTXO model, as it differs significantly from account-based models.
*   **Formal Verification (where applicable):** Leverage tools and techniques for formal verification if possible, especially for critical contract components. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>
*   **Open Source:** Making the codebase public, as planned for NikePig, fosters trust and allows for community review. <mcreference link="https://www.antiersolutions.com/cardano-blockchain-development-a-comprehensive-guide/" index="1">1</mcreference>

## 2.6. Minting Policies for Native Tokens and NFTs

As discussed in `01_Cardano_Fundamentals.md`, native tokens and NFTs on Cardano are governed by minting policies. <mcreference link="https://docs.cardano.org/native-tokens/learn/" index="2">2</mcreference>

*   **Policy Scripts:** These are Plutus scripts that define the rules for creating (minting) and destroying (burning) tokens. <mcreference link="https://docs.cardano.org/native-tokens/learn/" index="2">2</mcreference>
*   **Policy ID:** A unique identifier derived from the minting policy script. <mcreference link="https://docs.cardano.org/native-tokens/learn/" index="2">2</mcreference>
*   **Asset Name:** The name of the token (e.g., "NIKEPIG", "MISTER", or the name of an NFT). <mcreference link="https://docs.cardano.org/native-tokens/learn/" index="2">2</mcreference>

For NikePig, separate minting policies will be required for:
*   The $NIKEPIG token.
*   The $MISTER token.
*   Each collection of NFTs (Nikeverse, Mister NFTs), potentially with logic to enforce rarity tiers if managed on-chain.

---

Next: [03_NikePig_Architecture.md](./03_NikePig_Architecture.md)