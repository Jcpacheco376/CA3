import csv, os, re, datetime

# Map of Spanish months to numbers
MONTH_MAP = {
    'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
    'ABRI': 4 # Handle common typos
}

def parse_date_intel(text, context_year):
    if not text: return None, False, ""
    
    text = text.upper().strip()
    is_paid = any(x in text for x in ['PAGADO', 'PAGARON', 'PAGO'])
    
    # Try to extract the first day and month
    # Pattern: DD-MMM or DD AL DD MMM or DD-DD-MMM
    # We look for a number followed by a month name
    
    # Clean text for common patterns
    clean_text = text.replace('DEL ', '').replace(' AL ', '-').replace('/', '-')
    
    # Match pattern like "10-18-FEB" or "10-FEB"
    match = re.search(r'(\d{1,2})[-\s/]*([A-Z]{3,4})', clean_text)
    if match:
        day = int(match.group(1))
        month_str = match.group(2)
        month = MONTH_MAP.get(month_str, MONTH_MAP.get(month_str[:3]))
        
        if month:
            # Check if year is explicitly mentioned like 15-MAR-2023 or 15-MAR-23
            year_match = re.search(r'(\d{4})|(\d{2})$', clean_text)
            year = context_year
            if year_match:
                y_val = year_match.group(0)
                if len(y_val) == 4: year = int(y_val)
                elif len(y_val) == 2: year = 2000 + int(y_val)
            
            try:
                dt = datetime.date(year, month, day)
                return dt.strftime('%Y-%m-%d'), is_paid, ""
            except:
                return None, is_paid, f"Error interpretando fecha: {text}"
                
    # If no month name, maybe just a month name like "ENE"
    for m_name, m_num in MONTH_MAP.items():
        if m_name in text:
            try:
                dt = datetime.date(context_year, m_num, 1)
                return dt.strftime('%Y-%m-%d'), is_paid, "Solo se especificó el mes"
            except: pass

    return None, is_paid, f"No se pudo inferir fecha exacta: {text}"

def process_files():
    files = [
        ('vacaciones2026-2022-2023.csv', 2023),
        ('vacaciones2026-2023.csv', 2023),
        ('vacaciones2026-2024.csv', 2024),
        ('vacaciones2026-2025.csv', 2025),
        ('vacaciones2026-2026.csv', 2026)
    ]
    
    results = []
    
    for filename, context_year in files:
        if not os.path.exists(filename): continue
        print(f"Processing {filename}...")
        
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
            
            # Find the starting point
            data_start = -1
            for i, row in enumerate(rows):
                if row and ('GASTELUM HERNANDEZ' in row[0] or 'BELTRAN LOPEZ' in row[0]):
                    data_start = i
                    break
            
            if data_start == -1: continue
            
            start_col = 5
            if '2022-2023' in filename: start_col = 6
            elif '2025' in filename or '2026' in filename: start_col = 5

            # Find where "Dias Gozados" section starts and ends
            limit_col = len(rows[data_start]) # Default to end of row
            
            for h_idx in range(max(0, data_start - 3), data_start):
                h_row = rows[h_idx]
                for c_idx, cell in enumerate(h_row):
                    cell_up = cell.upper()
                    # Only search for limit keywords AFTER the start_col + offset (e.g. +4 columns of data)
                    if c_idx > start_col + 2:
                        if 'TOTAL' in cell_up or 'GOZADOS' in cell_up or 'PENDIENTES' in cell_up or 'AL ' in cell_up:
                            if c_idx < limit_col:
                                limit_col = c_idx
                                break
            
            print(f"  - Data start row: {data_start}, Start col: {start_col}, Limit col: {limit_col}")

            for r_idx in range(data_start, len(rows)):
                row = rows[r_idx]
                if not row or not row[0].strip(): continue
                
                emp_name = row[0].strip()
                if emp_name in ['EMPLEADOS', 'EMPLEADO', 'TOTAL']: continue
                
                hire_date = row[1].strip() if len(row) > 1 else ""
                
                # Extract Gozados (Pairs of Dias/Periodo)
                # We stop strictly at limit_col
                for c_idx in range(start_col, limit_col - 1, 2):
                    dias_val = row[c_idx].strip()
                    periodo_val = row[c_idx+1].strip() if c_idx+1 < len(row) else ""
                    
                    if not dias_val and not periodo_val: continue
                    if dias_val in ['Dias', 'Periodo', 'Gozados', 'Pendientes']: continue

                    try:
                        dias_clean = dias_val.replace(',', '.')
                        dias_float = float(dias_clean)
                        # We don't skip 0 anymore if there is text in periodo (might be a note)
                    except:
                        # Sometimes text is in "Dias" column
                        if any(x in dias_val.upper() for x in ['PAGO', 'LIQUID', 'VAC']):
                            dias_float = 0
                            if not periodo_val: periodo_val = dias_val
                        else:
                            continue

                    intepretation, is_paid, obs = parse_date_intel(periodo_val, context_year)
                    
                    results.append({
                        'Empleado': emp_name,
                        'FechaIngreso': hire_date,
                        'ArchivoOrigen': filename,
                        'Año_Contexto': context_year,
                        'Dias': dias_float,
                        'Periodo_Original': periodo_val,
                        'Fecha_Interpretada': intepretation if intepretation else "REVISAR",
                        'Es_Pagado': 1 if is_paid else 0,
                        'Observaciones': obs
                    })

    # Write results
    output_file = 'consolidated_vacations_clean.csv'
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = ['Empleado', 'FechaIngreso', 'ArchivoOrigen', 'Año_Contexto', 'Dias', 'Periodo_Original', 'Fecha_Interpretada', 'Es_Pagado', 'Observaciones']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for res in results:
            writer.writerow(res)
    
    print(f"DONE! {len(results)} records exported to {output_file}")

if __name__ == "__main__":
    process_files()
