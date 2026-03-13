import { Injectable } from '@nestjs/common';
import { Country, State, City } from 'country-state-city';
import * as frTranslations from './translations/fr.json';

@Injectable()
export class LocationService {
  private frCountries = frTranslations.countries;
  private frStates = frTranslations.states;

  /**
   * Get all countries with French names
   */
  getAllCountries(search?: string) {
    let countries = Country.getAllCountries();

    // Exclude Israel
    countries = countries.filter((country) => country.isoCode !== 'IL');

    // Filter by search if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      countries = countries.filter((country) => {
        const frenchName = this.frCountries[country.isoCode] || country.name;
        return (
          frenchName.toLowerCase().includes(searchLower) ||
          country.isoCode.toLowerCase().includes(searchLower)
        );
      });
    }

    return countries.map((country) => ({
      isoCode: country.isoCode,
      name: this.frCountries[country.isoCode] || country.name,
    }));
  }

  /**
   * Get cities by country code with French names
   */
  getCitiesByCountry(countryCode: string, search?: string) {
    const states = State.getStatesOfCountry(countryCode);

    if (!states || states.length === 0) {
      return [];
    }

    const cities: any[] = [];

    for (const state of states) {
      const stateCities = City.getCitiesOfState(countryCode, state.isoCode);
      if (stateCities) {
        const stateName = this.getStateName(countryCode, state.isoCode, state.name);
        cities.push(
          ...stateCities.map((city) => ({
            name: city.name,
            governorate: stateName,
            governorateCode: state.isoCode,
            countryCode,
          }))
        );
      }
    }

    // Filter by search if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      return cities.filter(
        (city) =>
          city.name.toLowerCase().includes(searchLower) ||
          city.governorate.toLowerCase().includes(searchLower)
      );
    }

    return cities;
  }

  /**
   * Get states by country code with French names
   */
  getStatesByCountry(countryCode: string, search?: string) {
    const states = State.getStatesOfCountry(countryCode);

    if (!states) {
      return [];
    }

    let result = states.map((state) => ({
      isoCode: state.isoCode,
      name: this.getStateName(countryCode, state.isoCode, state.name),
      countryCode,
    }));

    // Filter by search if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (state) =>
          state.name.toLowerCase().includes(searchLower) ||
          state.isoCode.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }

  /**
   * Get state name in French if available, otherwise return original name
   */
  private getStateName(countryCode: string, stateCode: string, defaultName: string): string {
    if (this.frStates[countryCode] && this.frStates[countryCode][stateCode]) {
      return this.frStates[countryCode][stateCode];
    }
    return defaultName;
  }
}
