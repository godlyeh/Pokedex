const PokemonTypeColors: { [TypeName: string]: string } = {
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

class CPokemonType
{
    Name: string;
    RGB: string;
    Weaknesses: CPokemonType[] = [];

    constructor(Type: string)
    {
        this.Name = Type.charAt(0).toUpperCase() + Type.substring(1);
        this.RGB = PokemonTypeColors[Type];
    }
}

type Pokemon = {
    Name: string,
    ID: number,
    Image: string,
    Description: string,
    Height: number,
    Weight: number,
    BaseEXP: number,
    Types?: CPokemonType[],
}

class CPokedex
{
    PokedexDownloadDiv: HTMLDivElement;
    PokedexDisplayList: HTMLLIElement;
    SelectedPokemonCard: HTMLDivElement | null = null;
    private PrintConsoleStrings: boolean = true;
    LoadPercentage: number = 0;

    Pokemons: Pokemon[] = [];
    PokemonTypes: CPokemonType[] = [];

    constructor()
    {
        this.PokedexDownloadDiv = document.createElement("div");
        this.PokedexDisplayList = document.createElement("li");
    }

    ConPrint(String: string)
    {
        if (!this.PrintConsoleStrings) return;
        console.log(String);
    }

    async FetchData(URL: string): Promise<any>
    {
        try {
            const response = await fetch(URL);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data (${URL}): ${error}`);
            return null;
        }
    }

    async GetPokemonCount(): Promise<number>
    {
        const data = await this.FetchData("https://pokeapi.co/api/v2/pokemon?limit=-1");
        if (data != null) {
            return data.count;
        }

        return 0;
    }

    GetPokemonTypeInfo(TypeName: string): CPokemonType | undefined {
        return this.PokemonTypes.find(typeInfo => typeInfo.Name.toLowerCase() == TypeName.toLowerCase()) || undefined;
    }

    async FillPokemonTypeData(): Promise<boolean>
    {
        const data = await this.FetchData("https://pokeapi.co/api/v2/type");
        if (data == null) return false;
        
        // Get all types
        this.PokemonTypes = data.results.map((typeInfo: any) => new CPokemonType(typeInfo.name));

        // Get all weakness
        const Promises = this.PokemonTypes.map((pokemonType) => this.FetchData(`https://pokeapi.co/api/v2/type/${pokemonType.Name.toLowerCase()}`));
        const PromiseData = await Promise.all(Promises);

        PromiseData.forEach((typeData, i) => {
            if (typeData != null) {
                this.PokemonTypes[i].Weaknesses = typeData.damage_relations.double_damage_from.map((typeWeakness: any) => new CPokemonType(typeWeakness.name));
            }
        });

        return true;
    }

    async FillPokedex(NumberOfPokemon: number)
    {
        if (await this.FillPokemonTypeData() == false) return;

        if (!NumberOfPokemon) return;

        this.ConPrint("Number of Pokemon to parse: " + NumberOfPokemon);
        const data = await this.FetchData(`https://pokeapi.co/api/v2/pokemon?limit=${NumberOfPokemon}`);
        if (data == null) return;

        // Load in pokemon data
        let CurrentPercent = 0;
        const ProgressionPercent = 100 / NumberOfPokemon;
        this.SetDownloadButtonEnabled(false);
        this.SetProgressBar(0);
        this.SetProgressInfo("fetching pokemon data..");
        this.Pokemons.length = 0;

        const Promises = data.results.map(async(pokemon_data: any)  => {
            const pokemonData = await this.FetchData(pokemon_data.url);
            const pokemonSpeciesData = await this.FetchData(`https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}/`);

            if (pokemonData != null) {
                // get pokemon description
                let PokemonDescription = "Description not available.";
                if (pokemonSpeciesData) {
                    PokemonDescription = pokemonSpeciesData.flavor_text_entries.find((entry: any) => entry.language.name == "en")?.flavor_text || "Description not available.";
                }

                // add pokemon
                let pokemon: Pokemon = {
                    Name: pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.substring(1),
                    ID: pokemonData.id,
                    Image: pokemonData.sprites.front_default || "",
                    Description: PokemonDescription.replace(/\n|\f/g, ' '),
                    Height: pokemonData.height,
                    Weight: pokemonData.weight,
                    BaseEXP: pokemonData.base_experience,
                    Types: pokemonData.types.map((typeInfo: any) => this.GetPokemonTypeInfo(typeInfo.type.name)), //new CPokemonType(typeInfo.type.name)),
                };

                this.Pokemons.push(pokemon);
                this.SetProgressInfo(`Added ${pokemonData.name}`);
                this.ConPrint(`${pokemon.Name}: [id: ${pokemon.ID}] [types: ${pokemon.Types?.map(type => type.Name).join(', ')}]`);
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

    UpdatePokemonDisplayList(PokemonList: Pokemon[] = this.Pokemons)
    {
        this.PokedexDisplayList.innerHTML = "";

        // Display pokemon cards
        PokemonList.forEach(Pokemon => {
            const PokemonCardDiv: HTMLDivElement = document.createElement("div");
            PokemonCardDiv.className = "pokemon_card_container";
            {
                 /* PokemonCardDiv.style.backgroundColor = "rgb(255, 255, 255)";
                if (Pokemon.Types != null && Pokemon.Types.length > 0)
                    PokemonCardDiv.style.backgroundColor = Pokemon.Types[0].RGB; */

                const PokemonDefaultInfoDiv: HTMLDivElement = document.createElement("div");
                PokemonDefaultInfoDiv.className = "pokemon_default_container";
                {
                    // image of pokemon
                    if (Pokemon.Image) {
                        const PokemonImage: HTMLImageElement = document.createElement("img");
                        PokemonImage.className = "pokemon_card_image";
                        PokemonImage.src = Pokemon.Image;
                        PokemonImage.alt = "404";
                        PokemonDefaultInfoDiv.append(PokemonImage);
                    }

                    // pokemon id
                    const PokemonID = document.createElement("label");
                    PokemonID.className = "pokemon_id";
                    PokemonID.innerHTML = `#${Pokemon.ID.toString().padStart(4, '0')}`
                    PokemonDefaultInfoDiv.append(PokemonID);

                    // name
                    const PokemonName: HTMLHeadElement = document.createElement("h2");
                    PokemonName.className = "pokemon_name";
                    PokemonName.innerHTML = Pokemon.Name;
                    PokemonDefaultInfoDiv.append(PokemonName);
                }
                PokemonCardDiv.append(PokemonDefaultInfoDiv);

                // Pokemon card info box
                const PokemonCardInfoDiv: HTMLDivElement = document.createElement("div");
                PokemonCardInfoDiv.className = "pokemon_card_infobox";
                {
                    // Description
                    const DescriptionLabel: HTMLParagraphElement = document.createElement("p");
                    DescriptionLabel.className = "pokemon_info_text";
                    DescriptionLabel.innerText = "Description:";
                    PokemonCardInfoDiv.append(DescriptionLabel);
                    
                    const PokemonDescription: HTMLParagraphElement = document.createElement("p");
                    PokemonDescription.className = "pokemon_description";
                    PokemonDescription.innerText = Pokemon.Description;
                    PokemonCardInfoDiv.append(PokemonDescription);

                    
                    // types
                    if (Pokemon.Types != null) {
                        const TypesLabel: HTMLParagraphElement = document.createElement("p");
                        TypesLabel.className = "pokemon_info_text";
                        TypesLabel.innerText = "Type:";
                        PokemonCardInfoDiv.append(TypesLabel);

                        const PokemonTypesDiv: HTMLDivElement = document.createElement("div");
                        PokemonTypesDiv.className = "pokemon_types_container";
                        {
                            Pokemon.Types.forEach(pokemonType => {
                                const PokemonType: HTMLParagraphElement = document.createElement("p");
                                PokemonType.className = "pokemon_type";
                                PokemonType.innerHTML = pokemonType.Name;
                                PokemonType.style.backgroundColor = pokemonType.RGB;
                                PokemonTypesDiv.append(PokemonType);
                            });
                        }PokemonCardInfoDiv.append(PokemonTypesDiv);

                        // weaknesses
                        const WeaknessesLabel: HTMLParagraphElement = document.createElement("p");
                        WeaknessesLabel.className = "pokemon_info_text";
                        WeaknessesLabel.innerText = "Weaknesses:";
                        PokemonCardInfoDiv.append(WeaknessesLabel);

                        Pokemon.Types.forEach(pokemonType => {
                            const PokemonWeaknessesDiv: HTMLDivElement = document.createElement("div");
                            PokemonWeaknessesDiv.className = "pokemon_types_container";
                            {
                                pokemonType.Weaknesses.forEach(weakness => {
                                    const Weakness: HTMLParagraphElement = document.createElement("p");
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

    SetProgressBar(Percentage: number)
    {
        const HTMLLabel = this.PokedexDownloadDiv.querySelector(".download_pokedex_progressbar_text") as HTMLLabelElement;
        const HTMLProgressBar = this.PokedexDownloadDiv.querySelector(".download_pokedex_progressbar_value") as HTMLDivElement;
        HTMLLabel.innerHTML = `${Percentage}%`;
        HTMLProgressBar.style.width = `${Percentage}%`;
    }

    SetProgressInfo(String: string)
    {
        const HTMLLabel = this.PokedexDownloadDiv.querySelector(".download_pokedex_status") as HTMLLabelElement;
        HTMLLabel.innerHTML = String;
    }

    SetDownloadButtonEnabled(Enabled: boolean)
    {
        const HTMLButton = this.PokedexDownloadDiv.querySelector(".download_pokedex_button") as HTMLButtonElement;
        HTMLButton.disabled = !Enabled;
    }
}

async function CreatePokedexHTML()
{
    // Set up pokeapi parsing
    const Pokedex = new CPokedex();
    const PokemonCount: number = await Pokedex.GetPokemonCount();

    // Header
    const PokedexTopDiv: HTMLDivElement = document.createElement("div");
    PokedexTopDiv.className = "pokedex_top";
    {
        const PokedexTextHeading: HTMLHeadingElement = document.createElement("h1");
        PokedexTextHeading.className = "pokedex_top_text";
        PokedexTextHeading.innerHTML = "Pokédex";
        PokedexTopDiv.appendChild(PokedexTextHeading);

        const PokedexInfo: HTMLLabelElement = document.createElement("label");
        PokedexInfo.className = "pokedex_top_info";
        PokedexInfo.innerHTML = `Existing pokemon ${PokemonCount}<br>`;
        PokedexInfo.innerHTML += "Made by Morten Helland";
        PokedexTopDiv.appendChild(PokedexInfo);
    } document.body.append(PokedexTopDiv);

    // Download pokemons into pokedex
    const DownloadPokedexDiv: HTMLDivElement = Pokedex.PokedexDownloadDiv;
    DownloadPokedexDiv.className = "download_pokedex_container";
    {
        // current status
        const DownloadPokedexInfo: HTMLLabelElement = document.createElement("label");
        DownloadPokedexInfo.className = "download_pokedex_info";
        DownloadPokedexInfo.innerHTML = "Number of pokemons to download";
        DownloadPokedexDiv.append(DownloadPokedexInfo);

        // text input and button div
        const DownloadInputDiv: HTMLDivElement = document.createElement("div");
        DownloadInputDiv.className = "download_pokedex_input_button_container";
        {
            // text input for number of pokemons to download
            const PokedexDownloadInput: HTMLInputElement = document.createElement("input");
            PokedexDownloadInput.className = "download_pokedex_input";
            PokedexDownloadInput.type = "number";
            PokedexDownloadInput.placeholder = "Enter value...";
            PokedexDownloadInput.defaultValue = "153";
            DownloadInputDiv.append(PokedexDownloadInput);

            // download button
            const PokedexDownloadButton: HTMLButtonElement = document.createElement("button");
            PokedexDownloadButton.innerText = "Download";
            PokedexDownloadButton.className = "download_pokedex_button";
            DownloadInputDiv.append(PokedexDownloadButton);

            PokedexDownloadButton.addEventListener("click", async () => {
                const InputValue: number = Number(PokedexDownloadInput.value);
                if (isNaN(InputValue) || InputValue < 1 || InputValue > PokemonCount) alert(`${PokedexDownloadInput.value} is invalid. Value has to be between 1 and ${PokemonCount}`);
                else {
                    Pokedex.FillPokedex(InputValue);
                }
            });
        }
        DownloadPokedexDiv.append(DownloadInputDiv);
        

        // progress bar
        const ProgressBarDiv: HTMLDivElement = document.createElement("div");
        ProgressBarDiv.className = "download_pokedex_progressbar";
        {
            const ProgressBarValueDiv: HTMLDivElement = document.createElement("div");
            ProgressBarValueDiv.className = "download_pokedex_progressbar_value";
            ProgressBarDiv.append(ProgressBarValueDiv);

            const ProgressText: HTMLLabelElement = document.createElement("label");
            ProgressText.className = "download_pokedex_progressbar_text";
            ProgressText.innerText = "0%";
            ProgressBarDiv.append(ProgressText);

            DownloadPokedexDiv.append(ProgressBarDiv);
        }

        // current status
        const DownloadPokedexStatus: HTMLLabelElement = document.createElement("label");
        DownloadPokedexStatus.className = "download_pokedex_status";
        DownloadPokedexStatus.innerHTML = "press 'download' to retrieve data..";
        DownloadPokedexDiv.append(DownloadPokedexStatus);
    } document.body.append(DownloadPokedexDiv);

    // Top container for filters, sorting, ...
    const TopSettingsDiv: HTMLDivElement = document.createElement("div");
    TopSettingsDiv.className = "top_settings_container";
    {
        // Combobox for sorting
        const SortSelect: HTMLSelectElement = document.createElement("select");
        SortSelect.className = "pokemon_sort";
        {
            SortSelect.innerHTML = `
                <option value="ID">Sort by ID</option>
                <option value="Name">Sort by Name</option>
            `;

            SortSelect.addEventListener("change", (event) => {
                const SelectionValue = (event.target as HTMLSelectElement).value;

                if (SelectionValue === "ID") {
                    Pokedex.Pokemons.sort((a, b) => a.ID - b.ID);
                    Pokedex.UpdatePokemonDisplayList();
                } else if (SelectionValue === "Name") {
                    Pokedex.Pokemons.sort((a, b) => a.Name.localeCompare(b.Name));
                    Pokedex.UpdatePokemonDisplayList();
                }
            });
        }TopSettingsDiv.append(SortSelect);

        // Input box for searching
        const SearchInput: HTMLInputElement = document.createElement("input");
        SearchInput.className = "pokemon_search_input";
        {
            SearchInput.type = "text";
            SearchInput.placeholder = "Search pokémon by name...";

            SearchInput.addEventListener("input", (event) => {
                const SearchValue = (event.target as HTMLInputElement).value.toLowerCase();
                const FilteredPokemons = Pokedex.Pokemons.filter(pokemon => pokemon.Name.toLowerCase().includes(SearchValue));
                Pokedex.UpdatePokemonDisplayList(FilteredPokemons);
            });
        }TopSettingsDiv.append(SearchInput);
    }document.body.append(TopSettingsDiv);

    // Draw pokemon cards
    const PokedexDisplayList: HTMLLIElement = Pokedex.PokedexDisplayList;
    PokedexDisplayList.className = "display_pokedex_container";
    {
        
    }document.body.append(PokedexDisplayList);
}