// Mărci auto pentru sugestii (datalist) la introducerea mașinii.
export const MARCI_AUTO: string[] = [
  'Abarth', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'BYD',
  'Cadillac', 'Chevrolet', 'Chrysler', 'Citroën', 'Cupra', 'Dacia', 'Daewoo',
  'Daihatsu', 'Dodge', 'DS', 'Ferrari', 'Fiat', 'Ford', 'Honda', 'Hummer',
  'Hyundai', 'Infiniti', 'Isuzu', 'Iveco', 'Jaguar', 'Jeep', 'Kia', 'Lada',
  'Lamborghini', 'Lancia', 'Land Rover', 'Lexus', 'Lotus', 'Maserati', 'Mazda',
  'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel',
  'Peugeot', 'Polestar', 'Porsche', 'Renault', 'Rolls-Royce', 'Rover', 'Saab',
  'Seat', 'Škoda', 'Smart', 'SsangYong', 'Subaru', 'Suzuki', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo',
];

// Datalist HTML — se include o dată pe pagina cu câmpul de marcă.
export const MARCI_DATALIST = `<datalist id="marci-list">${MARCI_AUTO.map((m) => `<option value="${m}"></option>`).join('')}</datalist>`;
