import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LocationService } from './location.service';

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries with French names' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by country name or ISO code',
  })
  getAllCountries(@Query('search') search?: string) {
    const countries = this.locationService.getAllCountries(search);
    return {
      status: 'success',
      code: '200',
      data: countries,
    };
  }

  @Get('states')
  @ApiOperation({ summary: 'Get states/governorates by country code with French names' })
  @ApiQuery({
    name: 'countryCode',
    required: true,
    type: String,
    description: 'ISO country code (e.g., US, FR, MA, TN)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by state/governorate name or code',
  })
  getStatesByCountry(@Query('countryCode') countryCode: string, @Query('search') search?: string) {
    const states = this.locationService.getStatesByCountry(countryCode, search);
    return {
      status: 'success',
      code: '200',
      data: states,
    };
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get cities by country code with governorate names' })
  @ApiQuery({
    name: 'countryCode',
    required: true,
    type: String,
    description: 'ISO country code (e.g., US, FR, MA, TN)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by city name or governorate name',
  })
  getCitiesByCountry(@Query('countryCode') countryCode: string, @Query('search') search?: string) {
    const cities = this.locationService.getCitiesByCountry(countryCode, search);
    return {
      status: 'success',
      code: '200',
      data: cities,
    };
  }
}
