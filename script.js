"use strict";
const PokemonTypeColors = {
    normal: "rgb(168, 167, 122)",
    fire: "rgb(238, 129, 48)",
    water: "rgb(99, 144, 240)",
    electric: "rgb(247, 208, 44)",
    grass: "rgb(122, 199, 76)",
    ice: "rgb(150, 217, 214)",
    fighting: "rgb(194, 46, 40)",
    poison: "rgb(163, 62, 161)",
    ground: "rgb(226, 191, 101)",
    flying: "rgb(169, 143, 243)",
    psychic: "rgb(249, 85, 135)",
    bug: "rgb(166, 185, 26)",
    rock: "rgb(182, 161, 54)",
    ghost: "rgb(115, 87, 151)",
    dragon: "rgb(111, 53, 252)",
    dark: "rgb(112, 87, 70)",
    steel: "rgb(183, 183, 206)",
    fairy: "rgb(214, 133, 173)",
};
class CPokemonType {
    constructor(Type) {
        this.Weaknesses = [];
        this.Name = Type.charAt(0).toUpperCase() + Type.substring(1);
        this.RGB = PokemonTypeColors[Type];
    }
}
class CPokedex {
    constructor() {
        this.SelectedPokemonCard = null;
        this.PrintConsoleStrings = true;
        this.LoadPercentage = 0;
        this.Pokemons = [];
        this.PokemonTypes = [];
        this.PokedexDownloadDiv = document.createElement("div");
        this.PokedexDisplayList = document.createElement("li");
    }
    ConPrint(String) {
        if (!this.PrintConsoleStrings)
            return;
        console.log(String);
    }
    async FetchData(URL) {
        try {
            const response = await fetch(URL);
            return await response.json();
        }
        catch (error) {
            console.error(`Error fetching data (${URL}): ${error}`);
            return null;
        }
    }
    async GetPokemonCount() {
        const data = await this.FetchData("https://pokeapi.co/api/v2/pokemon?limit=-1");
        if (data != null) {
            return data.count;
        }
        return 0;
    }
    GetPokemonTypeInfo(TypeName) {
        return this.PokemonTypes.find(typeInfo => typeInfo.Name.toLowerCase() == TypeName.toLowerCase()) || undefined;
    }
    async FillPokemonTypeData() {
        const data = await this.FetchData("https://pokeapi.co/api/v2/type");
        if (data == null)
            return false;
        // Get all types
        this.PokemonTypes = data.results.map((typeInfo) => new CPokemonType(typeInfo.name));
        // Get all weakness
        const Promises = this.PokemonTypes.map((pokemonType) => this.FetchData(`https://pokeapi.co/api/v2/type/${pokemonType.Name.toLowerCase()}`));
        const PromiseData = await Promise.all(Promises);
        PromiseData.forEach((typeData, i) => {
            if (typeData != null) {
                this.PokemonTypes[i].Weaknesses = typeData.damage_relations.double_damage_from.map((typeWeakness) => new CPokemonType(typeWeakness.name));
            }
        });
        return true;
    }
    async FillPokedex(NumberOfPokemon) {
        if (await this.FillPokemonTypeData() == false)
            return;
        if (!NumberOfPokemon)
            return;
        this.ConPrint("Number of Pokemon to parse: " + NumberOfPokemon);
        const data = await this.FetchData(`https://pokeapi.co/api/v2/pokemon?limit=${NumberOfPokemon}`);
        if (data == null)
            return;
        // Load in pokemon data
        let CurrentPercent = 0;
        const ProgressionPercent = 100 / NumberOfPokemon;
        this.SetDownloadButtonEnabled(false);
        this.SetProgressBar(0);
        this.SetProgressInfo("fetching pokemon data..");
        this.Pokemons.length = 0;
        const Promises = data.results.map(async (pokemon_data) => {
            var _a, _b;
            const pokemonData = await this.FetchData(pokemon_data.url);
            const pokemonSpeciesData = await this.FetchData(`https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}/`);
            if (pokemonData != null) {
                // get pokemon description
                let PokemonDescription = "Description not available.";
                if (pokemonSpeciesData) {
                    PokemonDescription = ((_a = pokemonSpeciesData.flavor_text_entries.find((entry) => entry.language.name == "en")) === null || _a === void 0 ? void 0 : _a.flavor_text) || "Description not available.";
                }
                // add pokemon
                let pokemon = {
                    Name: pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.substring(1),
                    ID: pokemonData.id,
                    Image: pokemonData.sprites.front_default || "",
                    Description: PokemonDescription.replace(/\n|\f/g, ' '),
                    Height: pokemonData.height,
                    Weight: pokemonData.weight,
                    BaseEXP: pokemonData.base_experience,
                    Types: pokemonData.types.map((typeInfo) => this.GetPokemonTypeInfo(typeInfo.type.name)), //new CPokemonType(typeInfo.type.name)),
                };
                this.Pokemons.push(pokemon);
                this.SetProgressInfo(`Added ${pokemonData.name}`);
                this.ConPrint(`${pokemon.Name}: [id: ${pokemon.ID}] [types: ${(_b = pokemon.Types) === null || _b === void 0 ? void 0 : _b.map(type => type.Name).join(', ')}]`);
            }
            // update progress
            CurrentPercent += ProgressionPercent;
            this.LoadPercentage = Number(Math.min(Math.max(CurrentPercent, 0), 100).toFixed(0));
            this.SetProgressBar(this.LoadPercentage);
        });
        await Promise.all(Promises);
        // Set progress info to finished
        this.SetProgressBar(100);
        this.SetProgressInfo("finished parsing");
        this.SetDownloadButtonEnabled(true);
        // Display pokemons
        this.Pokemons.sort((a, b) => a.ID - b.ID);
        this.UpdatePokemonDisplayList();
    }
    UpdatePokemonDisplayList(PokemonList = this.Pokemons) {
        this.PokedexDisplayList.innerHTML = "";
        // Display pokemon cards
        PokemonList.forEach(Pokemon => {
            const PokemonCardDiv = document.createElement("div");
            PokemonCardDiv.className = "pokemon_card_container";
            {
                /* PokemonCardDiv.style.backgroundColor = "rgb(255, 255, 255)";
               if (Pokemon.Types != null && Pokemon.Types.length > 0)
                   PokemonCardDiv.style.backgroundColor = Pokemon.Types[0].RGB; */
                const PokemonDefaultInfoDiv = document.createElement("div");
                PokemonDefaultInfoDiv.className = "pokemon_default_container";
                {
                    // image of pokemon
                    if (Pokemon.Image) {
                        const PokemonImage = document.createElement("img");
                        PokemonImage.className = "pokemon_card_image";
                        PokemonImage.src = Pokemon.Image;
                        PokemonImage.alt = "404";
                        PokemonDefaultInfoDiv.append(PokemonImage);
                    }
                    // pokemon id
                    const PokemonID = document.createElement("label");
                    PokemonID.className = "pokemon_id";
                    PokemonID.innerHTML = `#${Pokemon.ID.toString().padStart(4, '0')}`;
                    PokemonDefaultInfoDiv.append(PokemonID);
                    // name
                    const PokemonName = document.createElement("h2");
                    PokemonName.className = "pokemon_name";
                    PokemonName.innerHTML = Pokemon.Name;
                    PokemonDefaultInfoDiv.append(PokemonName);
                }
                PokemonCardDiv.append(PokemonDefaultInfoDiv);
                // Pokemon card info box
                const PokemonCardInfoDiv = document.createElement("div");
                PokemonCardInfoDiv.className = "pokemon_card_infobox";
                {
                    // Description
                    const DescriptionLabel = document.createElement("p");
                    DescriptionLabel.className = "pokemon_info_text";
                    DescriptionLabel.innerText = "Description:";
                    PokemonCardInfoDiv.append(DescriptionLabel);
                    const PokemonDescription = document.createElement("p");
                    PokemonDescription.className = "pokemon_description";
                    PokemonDescription.innerText = Pokemon.Description;
                    PokemonCardInfoDiv.append(PokemonDescription);
                    // types
                    if (Pokemon.Types != null) {
                        const TypesLabel = document.createElement("p");
                        TypesLabel.className = "pokemon_info_text";
                        TypesLabel.innerText = "Type:";
                        PokemonCardInfoDiv.append(TypesLabel);
                        const PokemonTypesDiv = document.createElement("div");
                        PokemonTypesDiv.className = "pokemon_types_container";
                        {
                            Pokemon.Types.forEach(pokemonType => {
                                const PokemonType = document.createElement("p");
                                PokemonType.className = "pokemon_type";
                                PokemonType.innerHTML = pokemonType.Name;
                                PokemonType.style.backgroundColor = pokemonType.RGB;
                                PokemonTypesDiv.append(PokemonType);
                            });
                        }
                        PokemonCardInfoDiv.append(PokemonTypesDiv);
                        // weaknesses
                        const WeaknessesLabel = document.createElement("p");
                        WeaknessesLabel.className = "pokemon_info_text";
                        WeaknessesLabel.innerText = "Weaknesses:";
                        PokemonCardInfoDiv.append(WeaknessesLabel);
                        Pokemon.Types.forEach(pokemonType => {
                            const PokemonWeaknessesDiv = document.createElement("div");
                            PokemonWeaknessesDiv.className = "pokemon_types_container";
                            {
                                pokemonType.Weaknesses.forEach(weakness => {
                                    const Weakness = document.createElement("p");
                                    Weakness.className = "pokemon_type";
                                    Weakness.innerHTML = weakness.Name;
                                    Weakness.style.backgroundColor = weakness.RGB;
                                    PokemonWeaknessesDiv.append(Weakness);
                                });
                            }
                            PokemonCardInfoDiv.append(PokemonWeaknessesDiv);
                        });
                    }
                }
                PokemonCardDiv.append(PokemonCardInfoDiv);
            }
            PokemonCardDiv.addEventListener("click", () => {
                if (this.SelectedPokemonCard && this.SelectedPokemonCard !== PokemonCardDiv)
                    this.SelectedPokemonCard.classList.remove("pokemon_card_container_selected");
                this.SelectedPokemonCard = PokemonCardDiv.classList.toggle("pokemon_card_container_selected") ? PokemonCardDiv : null;
            });
            //const PokedexDisplayDivQuery = this.PokedexDisplayDiv.querySelector(".display_pokedex_container") as HTMLDivElement;
            this.PokedexDisplayList.append(PokemonCardDiv);
        });
    }
    SetProgressBar(Percentage) {
        const HTMLLabel = this.PokedexDownloadDiv.querySelector(".download_pokedex_progressbar_text");
        const HTMLProgressBar = this.PokedexDownloadDiv.querySelector(".download_pokedex_progressbar_value");
        HTMLLabel.innerHTML = `${Percentage}%`;
        HTMLProgressBar.style.width = `${Percentage}%`;
    }
    SetProgressInfo(String) {
        const HTMLLabel = this.PokedexDownloadDiv.querySelector(".download_pokedex_status");
        HTMLLabel.innerHTML = String;
    }
    SetDownloadButtonEnabled(Enabled) {
        const HTMLButton = this.PokedexDownloadDiv.querySelector(".download_pokedex_button");
        HTMLButton.disabled = !Enabled;
    }
}
async function CreatePokedexHTML() {
    // Set up pokeapi parsing
    const Pokedex = new CPokedex();
    const PokemonCount = await Pokedex.GetPokemonCount();
    // Header
    const PokedexTopDiv = document.createElement("div");
    PokedexTopDiv.className = "pokedex_top";
    {
        const PokedexTextHeading = document.createElement("h1");
        PokedexTextHeading.className = "pokedex_top_text";
        PokedexTextHeading.innerHTML = "Pokédex";
        PokedexTopDiv.appendChild(PokedexTextHeading);
        const PokedexInfo = document.createElement("label");
        PokedexInfo.className = "pokedex_top_info";
        PokedexInfo.innerHTML = `Existing pokemon ${PokemonCount}<br>`;
        PokedexInfo.innerHTML += "Made by Morten Helland";
        PokedexTopDiv.appendChild(PokedexInfo);
    }
    document.body.append(PokedexTopDiv);
    // Download pokemons into pokedex
    const DownloadPokedexDiv = Pokedex.PokedexDownloadDiv;
    DownloadPokedexDiv.className = "download_pokedex_container";
    {
        // current status
        const DownloadPokedexInfo = document.createElement("label");
        DownloadPokedexInfo.className = "download_pokedex_info";
        DownloadPokedexInfo.innerHTML = "Number of pokemons to download";
        DownloadPokedexDiv.append(DownloadPokedexInfo);
        // text input and button div
        const DownloadInputDiv = document.createElement("div");
        DownloadInputDiv.className = "download_pokedex_input_button_container";
        {
            // text input for number of pokemons to download
            const PokedexDownloadInput = document.createElement("input");
            PokedexDownloadInput.className = "download_pokedex_input";
            PokedexDownloadInput.type = "number";
            PokedexDownloadInput.placeholder = "Enter value...";
            PokedexDownloadInput.defaultValue = "153";
            DownloadInputDiv.append(PokedexDownloadInput);
            // download button
            const PokedexDownloadButton = document.createElement("button");
            PokedexDownloadButton.innerText = "Download";
            PokedexDownloadButton.className = "download_pokedex_button";
            DownloadInputDiv.append(PokedexDownloadButton);
            PokedexDownloadButton.addEventListener("click", async () => {
                const InputValue = Number(PokedexDownloadInput.value);
                if (isNaN(InputValue) || InputValue < 1 || InputValue > PokemonCount)
                    alert(`${PokedexDownloadInput.value} is invalid. Value has to be between 1 and ${PokemonCount}`);
                else {
                    Pokedex.FillPokedex(InputValue);
                }
            });
        }
        DownloadPokedexDiv.append(DownloadInputDiv);
        // progress bar
        const ProgressBarDiv = document.createElement("div");
        ProgressBarDiv.className = "download_pokedex_progressbar";
        {
            const ProgressBarValueDiv = document.createElement("div");
            ProgressBarValueDiv.className = "download_pokedex_progressbar_value";
            ProgressBarDiv.append(ProgressBarValueDiv);
            const ProgressText = document.createElement("label");
            ProgressText.className = "download_pokedex_progressbar_text";
            ProgressText.innerText = "0%";
            ProgressBarDiv.append(ProgressText);
            DownloadPokedexDiv.append(ProgressBarDiv);
        }
        // current status
        const DownloadPokedexStatus = document.createElement("label");
        DownloadPokedexStatus.className = "download_pokedex_status";
        DownloadPokedexStatus.innerHTML = "press 'download' to retrieve data..";
        DownloadPokedexDiv.append(DownloadPokedexStatus);
    }
    document.body.append(DownloadPokedexDiv);
    // Top container for filters, sorting, ...
    const TopSettingsDiv = document.createElement("div");
    TopSettingsDiv.className = "top_settings_container";
    {
        // Combobox for sorting
        const SortSelect = document.createElement("select");
        SortSelect.className = "pokemon_sort";
        {
            SortSelect.innerHTML = `
                <option value="ID">Sort by ID</option>
                <option value="Name">Sort by Name</option>
            `;
            SortSelect.addEventListener("change", (event) => {
                const SelectionValue = event.target.value;
                if (SelectionValue === "ID") {
                    Pokedex.Pokemons.sort((a, b) => a.ID - b.ID);
                    Pokedex.UpdatePokemonDisplayList();
                }
                else if (SelectionValue === "Name") {
                    Pokedex.Pokemons.sort((a, b) => a.Name.localeCompare(b.Name));
                    Pokedex.UpdatePokemonDisplayList();
                }
            });
        }
        TopSettingsDiv.append(SortSelect);
        // Input box for searching
        const SearchInput = document.createElement("input");
        SearchInput.className = "pokemon_search_input";
        {
            SearchInput.type = "text";
            SearchInput.placeholder = "Search pokémon by name...";
            SearchInput.addEventListener("input", (event) => {
                const SearchValue = event.target.value.toLowerCase();
                const FilteredPokemons = Pokedex.Pokemons.filter(pokemon => pokemon.Name.toLowerCase().includes(SearchValue));
                Pokedex.UpdatePokemonDisplayList(FilteredPokemons);
            });
        }
        TopSettingsDiv.append(SearchInput);
    }
    document.body.append(TopSettingsDiv);
    // Draw pokemon cards
    const PokedexDisplayList = Pokedex.PokedexDisplayList;
    PokedexDisplayList.className = "display_pokedex_container";
    {
    }
    document.body.append(PokedexDisplayList);
}
