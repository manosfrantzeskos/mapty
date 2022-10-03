"use strict";

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    id = Date.now();
    date = new Date();

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    getTheDate() {
        return this.date.getDate() + " " + months[this.date.getMonth()];
    }
}


class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.pace = this.calculatePace();
        this.description = `🏃‍♂️ Running Workout on ${this.getTheDate()}`;
    }

    calculatePace() {
        // min/km
        return this.duration / this.distance;
    }
}


class Cycling extends Workout {
    type = "cycling";

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.speed = this.calculateSpeed();
        this.description = `🚴‍♂️ Cycling Workout on ${this.getTheDate()}`;
    }

    calculateSpeed() {
        // km/h
        return this.distance / this.duration;
    }
}


class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._retrieveLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener("change", this._toggleElevationField);     
        containerWorkouts.addEventListener("click", this._moveToMarker.bind(this));
    }


    _moveToMarker(event) {
        const element = event.target.closest(".workout");

        if (!element) return;

        const id = +element.dataset.id;
        const workout = this.#workouts.find(work => work.id === id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    // Gets user's current position - using the Geolocation API - and uses it to load a map 
    // based on the these coordinates
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                () => {
                    alert("Could not get your position.");
                });
        } else {
            alert("Geolocation is not available in this device.");
        }
    }


    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        const coords = [latitude - 0.013, longitude - 0.00061];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);


        this.#map.on("click", this._showForm.bind(this));

        this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    }


    _showForm(event) {
        this.#mapEvent = event;
        form.classList.remove("hidden");
        inputDistance.focus();        
    }


    _hideForm() {
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(() => form.style.display = "grid", 1000);
        this._clearFormInputs();        
    }


    _clearFormInputs() {
        inputDistance.value = "";
        inputDuration.value = "";
        inputCadence.value = "";
        inputElevation.value = "";
    }


    _toggleElevationField() {
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    }


    _newWorkout(event) {
        event.preventDefault();
        
        const {lat, lng} = this.#mapEvent.latlng;
        const coords = [lat, lng];

        // Helper functions
        function allNumbers(...inputs) {
            return inputs.every(inp => Number.isFinite(inp) && inp !== 0);
        }

        function allPositive(...inputs) {
            return inputs.every(inp => inp > 0);
        }

        // Get data from workout form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let workout;
        let workoutCSS;
        let workoutDate;
        let workoutTitle;

        if (type === "running") {
            const cadence = +inputCadence.value;

            if (! allNumbers(distance, duration, cadence)) {
                return alert("All inputs are mandatory and must be positive numbers");
            }

            if (! allPositive(distance, duration, cadence)) {
                return alert("All inputs must be positive numbers");
            }
            
            workout = new Running(coords, distance, duration, cadence);
        }
        
        if (type === "cycling") {
            const elevation = +inputElevation.value;

            if (! allNumbers(distance, duration, elevation)) {
                return alert("All inputs are mandatory and must be positive numbers except the elevation gain");
            }

            if (! allPositive(distance, duration)) {
                return alert("All inputs must be positive numbers except the elevation gain");
            }

            workout = new Cycling(coords, distance, duration, elevation);            
        }


        this.#workouts.push(workout);

        this._renderWorkoutMarker(workout);

        this._renderWorkout(workout);

        this._saveToLocalStorage();

        this._hideForm();
    }


    _saveToLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    _retrieveLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        
        if (!data) return;

        this.#workouts = data;
        
        data.forEach(work => this._renderWorkout(work));
    }


    _renderWorkoutMarker(work) {
        L.marker(work.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    autoClose: false,
                    closeOnClick: false,
                    className: `${work.type}-popup`
                }))
            .setPopupContent(work.description)
            .openPopup();
    }


    _renderWorkout(workout) {
        const name = workout.type.replace(workout.type[0], workout.type[0].toUpperCase());
        const date = new Date(workout.date);

        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${name} on ${date.getDate()} ${months[date.getMonth()]}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>`;

        if (workout.type === "running") {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>`;
        }

        if (workout.type === "cycling") {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>`;
        }

        form.insertAdjacentHTML("afterend", html);
    }

}

// App Initialization
const app = new App();