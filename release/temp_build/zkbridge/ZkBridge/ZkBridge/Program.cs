using ARSoftware.Contpaqi.Comercial.Sdk;
using ARSoftware.Contpaqi.Comercial.Sdk.DatosAbstractos;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class Program
{
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetDllDirectory(string lpPathName);

    static int Main(string[] args)
    {
        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
        {
            var ex = e.ExceptionObject as Exception;
            var msg = ex != null ? FormatError(ex) : (e.ExceptionObject?.ToString() ?? "(null)");
            Console.WriteLine($"ERROR | UnhandledException | {msg}");
        };

        int idFactura;
        if (args == null || args.Length == 0 || !int.TryParse(args[0], out idFactura) || idFactura <= 0)
        {
            Console.WriteLine("ERROR | Args | Debes pasar el ID de factura (entero > 0). Uso: ejecutable.exe <ID>");
            return 2;
        }

        string connString = null;

        try
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            var ini = new IniFile(Path.Combine(exeDir, "config.ini"));

            string rutaSdk = ini.Read("SDK", "RutaSdk");
            string rutaEmpresa = ini.Read("SDK", "RutaEmpresa");

            bool trusted = ini.ReadBool("SQL", "TrustedConnection", false);
            string server = ini.Read("SQL", "Server");
            string db = ini.Read("SQL", "Database");
            string user = ini.Read("SQL", "User");
            string pwd = ini.Read("SQL", "Password");

            connString = trusted
                ? $"Server={server};Database={db};Trusted_Connection=True;TrustServerCertificate=True;"
                : $"Server={server};Database={db};User Id={user};Password={pwd};TrustServerCertificate=True;";

            if (!SetDllDirectory(rutaSdk))
                Console.WriteLine($"WARN | SetDllDirectory | Falló SetDllDirectory para: {rutaSdk}");

            Environment.CurrentDirectory = rutaSdk;

            SdkCheck(AdminpaqSdk.fSetNombrePAQ("CONTPAQ I FACTURACION"), "fSetNombrePAQ");
            SdkCheck(AdminpaqSdk.fInicializaSDK(), "fInicializaSDK");
            SdkCheck(AdminpaqSdk.fAbreEmpresa(rutaEmpresa), "fAbreEmpresa");

            var data = ObtenerFacturaCompleta(connString, idFactura);
            var enc = data.Item1;
            var partidas = data.Item2;

            GarantizarCliente(connString, enc.CodigoCliente);

            // =========================================================================
            // ACTUALIZAR CORREO DEL CLIENTE (Para el envío del CFDI)
            // =========================================================================
            if (!string.IsNullOrWhiteSpace(enc.Email))
            {
                if (AdminpaqSdk.fBuscaCteProv(enc.CodigoCliente) == 0)
                {
                    if (AdminpaqSdk.fEditaCteProv() == 0)
                    {
                        // Se actualiza en el catálogo de clientes para que aparezca al timbrar
                        AdminpaqSdk.fSetDatoCteProv("CEMAIL", enc.Email);
                        AdminpaqSdk.fSetDatoCteProv("cEmail", enc.Email);
                        AdminpaqSdk.fGuardaCteProv();
                        Console.WriteLine($"INFO | Correo {enc.Email} actualizado en el cliente.");
                    }
                }
            }

            // =========================================================================
            // PASO 1: CREACIÓN DE CABECERA
            // =========================================================================
            var doc = new tDocumento
            {
                aCodConcepto = enc.CodigoConcepto,
                aSerie = enc.Serie ?? "",
                aFolio = CalcularFolio(enc),
                aFecha = enc.FechaEmision.ToString("MM/dd/yyyy"),
                aCodigoCteProv = enc.CodigoCliente,
                aReferencia = enc.Referencia ?? "",
                aNumMoneda = enc.Moneda,
                aTipoCambio = enc.TipoCambio,
                aImporte = (enc.TipoDocumento == 2) ? enc.Total : enc.Subtotal,
                aDescuentoDoc1 = enc.DesctoImp,
                aDescuentoDoc2 = 0,
                aSistemaOrigen = 0,
                aAfecta = 1,
            };

            int idDocumento = 0;
            SdkCheck(AdminpaqSdk.fAltaDocumento(ref idDocumento, ref doc), "fAltaDocumento");

            // =========================================================================
            // PASO 2: RECUPERAR FOLIO REAL Y DATOS EXTRA
            // =========================================================================
            SdkCheck(AdminpaqSdk.fBuscarIdDocumento(idDocumento), "fBuscaIdDocumento");

            StringBuilder sbFolio = new StringBuilder(20);
            AdminpaqSdk.fLeeDatoDocumento("CFOLIO", sbFolio, 20);
            double.TryParse(sbFolio.ToString(), out double folioAbonoReal);
            if (folioAbonoReal <= 0) folioAbonoReal = doc.aFolio;

            SdkCheck(AdminpaqSdk.fEditarDocumento(), "fEditarDocumento");

            // =========================================================================
            // CAMPOS REQUERIDOS PARA TIMBRADO CFDI 
            // Usamos nombres físicos de la BD y nombres lógicos para asegurar su guardado
            // =========================================================================

            // 1. Método de Pago (PUE / PPD)
            SetDatoDoc("CMETODOPAG", enc.MetodoPago);
            SetDatoDoc("cMetodoPago", enc.MetodoPago);

            // 2. Forma de Pago (01, 03, 99...) - ¡Faltaba enviar este!
            SetDatoDoc("CFORMAPAGO", enc.FormaPago);
            SetDatoDoc("cFormaPago", enc.FormaPago);

            // 3. Uso de CFDI (G01, G02, G03...)
            if (!string.IsNullOrWhiteSpace(enc.UsoCFDI))
            {
                SetDatoDoc("CUSOCFDI", enc.UsoCFDI);
                SetDatoDoc("cusocfdi", enc.UsoCFDI);
            }

            // Opcional: Condiciones de pago
            SetDatoDoc("CCANTPARCI", enc.CondicionPago);

            // Inyectamos físicamente los totales iniciales si es Nota de Crédito
            if (enc.TipoDocumento == 2)
            {
                AdminpaqSdk.fSetDatoDocumento("CTOTAL", enc.Total.ToString("0.00"));
                AdminpaqSdk.fSetDatoDocumento("CNETO", enc.Subtotal.ToString("0.00"));
                AdminpaqSdk.fSetDatoDocumento("CIMPUESTO1", enc.Impuesto1.ToString("0.00"));
                AdminpaqSdk.fSetDatoDocumento("CPENDIENTE", enc.Total.ToString("0.00"));

                var uuidsRelacionados = partidas.Where(p => !string.IsNullOrEmpty(p.FacturaOrigen_UUID)).Select(p => p.FacturaOrigen_UUID.Trim()).Distinct().ToList();
                if (uuidsRelacionados.Count > 0)
                {
                    string tipoRelacion = string.IsNullOrEmpty(enc.TipoRelacion) ? "01" : enc.TipoRelacion;
                    foreach (var u in uuidsRelacionados)
                    {
                        AdminpaqSdk.fAgregarRelacionCFDI2(doc.aCodConcepto, doc.aSerie, folioAbonoReal.ToString("0"), tipoRelacion, u);
                    }
                }
            }
            SdkCheck(AdminpaqSdk.fGuardaDocumento(), "fGuardaDocumento");

            // =========================================================================
            // PASO 3: APLICACIÓN DE SALDOS (Solo Notas de Crédito)
            // =========================================================================
            if (enc.TipoDocumento == 2)
            {
                foreach (var p in partidas)
                {
                    if (p.FacturaOrigen_Folio.HasValue && p.FacturaOrigen_Folio.Value > 0 && !string.IsNullOrEmpty(p.FacturaOrigen_Concepto))
                    {
                        double importeAp = p.ImporteAplicado ?? enc.Total;
                        if (importeAp <= 0) importeAp = enc.Total;

                        int monedaSdk = enc.Moneda <= 0 ? 1 : enc.Moneda;
                        AdminpaqSdk.fSaldarDocumento_Param(
                            p.FacturaOrigen_Concepto,
                            p.FacturaOrigen_Serie ?? "",
                            p.FacturaOrigen_Folio.Value,
                            doc.aCodConcepto,
                            doc.aSerie,
                            folioAbonoReal,
                            importeAp,
                            monedaSdk,
                            enc.FechaEmision.ToString("MM/dd/yyyy"));
                    }
                }
            }

            // =========================================================================
            // PASO 4: MOVIMIENTOS (Solo Facturas)
            // =========================================================================
            if (enc.TipoDocumento == 1)
            {
                for (int i = 0; i < partidas.Count; i++)
                {
                    var d = partidas[i];
                    GarantizarProducto(connString, d.CodigoProducto);

                    var mov = new tMovimiento
                    {
                        aCodProdSer = d.CodigoProducto,
                        aUnidades = d.Cantidad,
                        aPrecio = d.PrecioUnitario,
                        aCosto = 0,
                        aReferencia = d.Referencia ?? "",
                        aCodClasificacion = ""
                    };

                    int idMov = 0;
                    SdkCheck(AdminpaqSdk.fAltaMovimiento(idDocumento, ref idMov, ref mov), $"fAltaMovimiento (#{i + 1})");
                }
            }

            // =========================================================================
            // PASO 5: AFECTAR EL DOCUMENTO (Timbrado / Sellado)
            // =========================================================================
            var llave = new tLlaveDoc { aCodConcepto = doc.aCodConcepto, aSerie = doc.aSerie, aFolio = folioAbonoReal };
            SdkCheck(AdminpaqSdk.fAfectaDocto(ref llave, true), "fAfectaDocto");

            // =========================================================================
            // PASO 6: RESCATE POST-AFECTAR (Protección silenciosa para Notas de Crédito)
            // Verificamos si fAfectaDocto reseteó los totales y los restauramos.
            // =========================================================================
            if (enc.TipoDocumento == 2)
            {
                AdminpaqSdk.fBuscarIdDocumento(idDocumento);
                StringBuilder sbValorTotal = new StringBuilder(30);
                AdminpaqSdk.fLeeDatoDocumento("CTOTAL", sbValorTotal, 30);

                if (double.TryParse(sbValorTotal.ToString(), out double totalFinal) && totalFinal <= 0)
                {
                    try
                    {
                        AdminpaqSdk.fEditarDocumento();
                        AdminpaqSdk.fSetDatoDocumento("CTOTAL", enc.Total.ToString("0.00"));
                        AdminpaqSdk.fSetDatoDocumento("CNETO", enc.Subtotal.ToString("0.00"));
                        AdminpaqSdk.fSetDatoDocumento("CIMPUESTO1", enc.Impuesto1.ToString("0.00"));
                        AdminpaqSdk.fGuardaDocumento();
                    }
                    catch (Exception) { /* Falla silenciosa para no interrumpir el flujo exitoso */ }
                }
            }

            // === Post-proceso fijo ===
            TryEjecutarPostProc(connString, idFactura, true, null, folioAbonoReal);
            Console.WriteLine($"OK | Documento creado y afectado | idDocumento={idDocumento} | Llave={doc.aCodConcepto}/{doc.aSerie}-{folioAbonoReal}");
            return 0;
        }
        catch (Exception ex)
        {
            string mensajeError = FormatError(ex);
            TryEjecutarPostProc(connString, idFactura, false, mensajeError, 0);
            Console.WriteLine($"ERROR | Main | {mensajeError}");
            return 1;
        }
        finally
        {
            try { AdminpaqSdk.fCierraEmpresa(); } catch { }
            try { AdminpaqSdk.fTerminaSDK(); } catch { }
        }
    }

    // ========================================================================
    // Helpers SQL, SDK y Lógica de Negocio 
    // ========================================================================
    static Tuple<Encabezado, List<Detalle>> ObtenerFacturaCompleta(string connString, int id)
    {
        var enc = new Encabezado();
        var dets = new List<Detalle>();

        using (var cn = new SqlConnection(connString))
        {
            cn.Open();
            using (var cmd = new SqlCommand("sp_com_ObtenerDatosFacturaPorID", cn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add("@ID", SqlDbType.Int).Value = id;

                using (var rd = cmd.ExecuteReader())
                {
                    if (!rd.Read()) throw new ApplicationException("No se encontró encabezado para ese ID.");

                    enc.CodigoConcepto = rd["CodigoConcepto"] as string ?? "";
                    enc.Serie = rd["Serie"] as string;
                    enc.FechaEmision = (DateTime)rd["FechaEmision"];
                    enc.HoraEmision = rd["HoraEmision"] as string;
                    enc.Email = rd["Email"] as string;
                    enc.RFC = rd["RFC"] as string;
                    enc.RazonSocial = rd["RazonSocial"] as string;
                    enc.Total = Convert.ToDouble(rd["Total"]);
                    enc.Referencia = rd["Referencia"] as string;
                    enc.MetodoPago = rd["MetodoPago"] as string;
                    enc.FormaPago = rd["FormaPago"] as string;
                    try { enc.UsoCFDI = rd["UsoCFDI"] as string; } catch { }
                    try { enc.CondicionPago = rd["CondicionPago"] as string; } catch { }
                    enc.Observaciones = rd["Observaciones"] as string;
                    enc.Subtotal = Convert.ToDouble(rd["Subtotal"]);
                    enc.DesctoImp = Convert.ToDouble(rd["DesctoImp"]);
                    enc.Moneda = Convert.ToInt32(rd["Moneda"]);
                    enc.TipoCambio = Convert.ToDouble(rd["TipoCambio"]);
                    enc.Impuesto1 = Convert.ToDouble(rd["Impuesto1"]);
                    enc.Impuesto2 = Convert.ToDouble(rd["Impuesto2"]);
                    enc.Pendiente = rd["Pendiente"] as string;
                    enc.CodigoCliente = rd["CodigoCliente"] as string;

                    try { enc.TipoDocumento = Convert.ToInt32(rd["TipoDocumento"]); } catch { enc.TipoDocumento = 1; }
                    try { enc.TipoRelacion = rd["TipoRelacion"] as string; } catch { }

                    if (rd.NextResult())
                    {
                        while (rd.Read())
                        {
                            var det = new Detalle
                            {
                                Renglon = Convert.ToInt32(rd["Renglon"]),
                                CodigoProducto = rd["CodigoProducto"] as string ?? "",
                                Cantidad = Convert.ToDouble(rd["Cantidad"]),
                                PrecioUnitario = Convert.ToDouble(rd["PrecioUnitario"]),
                                Referencia = rd["Referencia"] as string,
                                DesctoImp = rd["DesctoImp"] is DBNull ? (double?)null : Convert.ToDouble(rd["DesctoImp"])
                            };

                            try { if (!rd.IsDBNull(rd.GetOrdinal("FacturaOrigen_Concepto"))) det.FacturaOrigen_Concepto = rd["FacturaOrigen_Concepto"] as string; } catch { }
                            try { if (!rd.IsDBNull(rd.GetOrdinal("FacturaOrigen_Serie"))) det.FacturaOrigen_Serie = rd["FacturaOrigen_Serie"] as string; } catch { }
                            try { if (!rd.IsDBNull(rd.GetOrdinal("FacturaOrigen_Folio"))) det.FacturaOrigen_Folio = Convert.ToDouble(rd["FacturaOrigen_Folio"]); } catch { }
                            try { if (!rd.IsDBNull(rd.GetOrdinal("FacturaOrigen_UUID"))) det.FacturaOrigen_UUID = rd["FacturaOrigen_UUID"] as string; } catch { }
                            try { if (!rd.IsDBNull(rd.GetOrdinal("ImporteAplicado"))) det.ImporteAplicado = Convert.ToDouble(rd["ImporteAplicado"]); } catch { }

                            dets.Add(det);
                        }
                    }
                }
            }
        }
        return Tuple.Create(enc, dets);
    }

    static void GarantizarCliente(string connString, string codigoCte)
    {
        if (AdminpaqSdk.fBuscaCteProv(codigoCte) != 0)
        {
            Console.WriteLine($"INFO | Cliente '{codigoCte}' no encontrado. Creando...");

            DataRow datos = ObtenerDatosDesdeSQL(connString, "sp_com_GetDatosClienteParaAlta", "@CodigoClienteBMS", codigoCte);
            if (datos == null) throw new ApplicationException($"Cliente {codigoCte} no existe en Compac ni en BMS.");
            var nuevoCte = new tCteProv { cCodigoCliente = SafeStr(datos["Codigo"], 30), cRazonSocial = SafeStr(datos["RazonSocial"], 60), cRFC = SafeStr(datos["RFC"], 20), cFechaAlta = DateTime.Now.ToString("yyyyMMdd"), cTipoCliente = 1, cEstatus = 1, cListaPreciosCliente = 1, cNombreMoneda = "(Ninguna)" };
            int idGenerado = 0;
            SdkCheck(AdminpaqSdk.fAltaCteProv(ref idGenerado, ref nuevoCte), "fAltaCteProv");
            SdkCheck(AdminpaqSdk.fBuscaCteProv(codigoCte), "fBuscaCteProv Post-Alta");
            SdkCheck(AdminpaqSdk.fEditaCteProv(), "fEditaCteProv");
            if (!string.IsNullOrEmpty(SafeStr(datos["RFC"], 20))) SdkCheck(AdminpaqSdk.fSetDatoCteProv("cRFC", SafeStr(datos["RFC"], 20)), "Set cRFC");
            SdkCheck(AdminpaqSdk.fSetDatoCteProv("cregimfisc", SafeStr(datos["RegimenFiscal"], 20)), "Set cregimfisc");
            SdkCheck(AdminpaqSdk.fGuardaCteProv(), "fGuardaCteProv");
            var direccion = new tDireccion { cCodCteProv = nuevoCte.cCodigoCliente, cTipoCatalogo = 1, cTipoDireccion = 1, cNombreCalle = ".", cNumeroExterior = ".", cNumeroInterior = ".", cColonia = ".", cCodigoPostal = "00000", cCiudad = ".", cEstado = ".", cPais = "MEXICO" };
            int idDir = 0;
            AdminpaqSdk.fAltaDireccion(ref idDir, ref direccion);
            InyectarDireccionDefinitiva(nuevoCte.cCodigoCliente, datos);
        }
    }

    static void InyectarDireccionDefinitiva(string codigoCte, DataRow datos)
    {
        int foundType = -1;
        for (int i = 0; i < 3; i++) { if (AdminpaqSdk.fBuscaDireccionCteProv(codigoCte, 0) == 0) { foundType = 0; break; } if (AdminpaqSdk.fBuscaDireccionCteProv(codigoCte, 1) == 0) { foundType = 1; break; } Thread.Sleep(500); }
        if (foundType == -1) return;
        SdkCheck(AdminpaqSdk.fEditaDireccion(), "fEditaDireccion");
        string cp = SafeStr(datos["CP"], 10);
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("cnombrec01", SafeStr(datos["Calle"], 60)), "Set Calle");
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("cnumeroe01", SafeStr(datos["NumExt"], 20)), "Set NumExt");
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("ccolonia", SafeStr(datos["Colonia"], 60)), "Set Colonia");
        if (AdminpaqSdk.fSetDatoDireccion("cCodigoPostal", cp) != 0) AdminpaqSdk.fSetDatoDireccion("ccodigop01", cp);
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("cciudad", SafeStr(datos["Ciudad"], 60)), "Set Ciudad");
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("cmunicipio", SafeStr(datos["Ciudad"], 60)), "Set Municipio");
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("cestado", SafeStr(datos["Estado"], 60)), "Set Estado");
        SdkCheck(AdminpaqSdk.fSetDatoDireccion("cpais", SafeStr(datos["Pais"], 60)), "Set Pais");
        SdkCheck(AdminpaqSdk.fGuardaDireccion(), "fGuardaDireccion (Inyeccion)");
    }

    static void GarantizarProducto(string connString, string codigoProd)
    {
        if (AdminpaqSdk.fBuscaProducto(codigoProd) != 0)
        {
            DataRow datos = ObtenerDatosDesdeSQL(connString, "sp_com_GetDatosProductoParaAlta", "@CodigoProductoBMS", codigoProd);
            if (datos == null) throw new ApplicationException($"Producto {codigoProd} no existe en Compac ni BMS.");
            string unidad = SafeStr(datos["CodigoUnidad"], 20);
            if (LocalSdk.fBuscaUnidad(unidad) != 0) { unidad = "PZA"; if (LocalSdk.fBuscaUnidad(unidad) != 0) unidad = "H87"; }
            var nuevoProd = new tProducto { cCodigoProducto = SafeStr(datos["Codigo"], 30), cNombreProducto = SafeStr(datos["Nombre"], 60), cDescripcionProducto = SafeStr(datos["Descripcion"], 60), cTipoProducto = 3, cFechaAltaProducto = DateTime.Now.ToString("yyyyMMdd"), cStatusProducto = 1, cMetodoCosteo = 1, cCodigoUnidadBase = unidad, cCodigoUnidadNoConvertible = "", cPrecio1 = Convert.ToDouble(datos["Precio1"]) };
            int idGenerado = 0;
            SdkCheck(AdminpaqSdk.fAltaProducto(ref idGenerado, ref nuevoProd), "fAltaProducto (Auto)");
            SdkCheck(AdminpaqSdk.fBuscaProducto(codigoProd), "fBuscaProducto Post-Alta");
            SdkCheck(AdminpaqSdk.fEditaProducto(), "fEditaProducto");
            string claveSat = SafeStr(datos["ClaveSAT"], 20);
            if (!string.IsNullOrEmpty(claveSat)) if (AdminpaqSdk.fSetDatoProducto("cclavesat", claveSat) != 0) AdminpaqSdk.fSetDatoProducto("CClaveSAT", claveSat);
            SdkCheck(AdminpaqSdk.fGuardaProducto(), "fGuardaProducto");
        }
    }

    static string SafeStr(object val, int maxLength) { if (val == null || val == DBNull.Value) return ""; string str = val.ToString().Trim(); return str.Length > maxLength ? str.Substring(0, maxLength) : str; }
    static DataRow ObtenerDatosDesdeSQL(string connString, string spName, string paramName, string paramValue) { using (var cn = new SqlConnection(connString)) { cn.Open(); using (var cmd = new SqlCommand(spName, cn)) { cmd.CommandType = CommandType.StoredProcedure; cmd.Parameters.AddWithValue(paramName, paramValue); var dt = new DataTable(); using (var da = new SqlDataAdapter(cmd)) { da.Fill(dt); } return dt.Rows.Count > 0 ? dt.Rows[0] : null; } } }
    static void TryEjecutarPostProc(string connString, int id, bool exito, string error, double aFolio) { if (string.IsNullOrWhiteSpace(connString)) return; try { using (var cn = new SqlConnection(connString)) { cn.Open(); using (var cmd = new SqlCommand("dbo.sp_com_FacturaPostImport", cn)) { cmd.CommandType = CommandType.StoredProcedure; cmd.Parameters.Add("@ID", SqlDbType.Int).Value = id; cmd.Parameters.Add("@Exito", SqlDbType.Bit).Value = exito; cmd.Parameters.Add("@cFolio", SqlDbType.Decimal).Value = aFolio; var pErr = cmd.Parameters.Add("@Error", SqlDbType.NVarChar, -1); if (string.IsNullOrEmpty(error)) pErr.Value = DBNull.Value; else pErr.Value = error; cmd.ExecuteNonQuery(); } } } catch (Exception ex) { Console.WriteLine($"ERROR | PostProc | {ex.Message}"); } }
    static string FormatError(Exception ex) { return $"{ex.GetType().FullName}: {ex.Message}"; }
    static double CalcularFolio(Encabezado e) { StringBuilder serie = new StringBuilder(e.Serie); double folio = 0; var rc = AdminpaqSdk.fSiguienteFolio(e.CodigoConcepto, serie, ref folio); if (rc != 0) return 0; return folio; }
    static void SdkCheck(int codigoError, string contexto, string extra = null) { if (codigoError == 0) return; var msg = new StringBuilder(1024); try { AdminpaqSdk.fError(codigoError, msg, msg.Capacity); } catch { } var texto = msg.Length > 0 ? msg.ToString() : "(sin detalle)"; Console.WriteLine($"ERROR | {contexto} | [{codigoError}] {texto}{(extra != null ? " | " + extra : "")}"); throw new ApplicationException($"{contexto}: [{codigoError}] {texto}"); }
    static void SetDatoDoc(string campo, string valor) { if (string.IsNullOrWhiteSpace(valor)) return; int rc = AdminpaqSdk.fSetDatoDocumento(campo, valor); if (rc != 0) Console.WriteLine($"WARN | fSetDatoDocumento {campo}='{valor}' falló (Err: {rc}). Se ignora."); }
}

class Encabezado
{
    public string CodigoConcepto { get; set; }
    public string Serie { get; set; }
    public DateTime FechaEmision { get; set; }
    public string HoraEmision { get; set; }
    public string Email { get; set; }
    public string RFC { get; set; }
    public string RazonSocial { get; set; }
    public double Total { get; set; }
    public string Referencia { get; set; }
    public string MetodoPago { get; set; }
    public string FormaPago { get; set; }
    public string UsoCFDI { get; set; }
    public string CondicionPago { get; set; }
    public string Observaciones { get; set; }
    public double Subtotal { get; set; }
    public double DesctoImp { get; set; }
    public Int32 Moneda { get; set; }
    public double TipoCambio { get; set; }
    public double Impuesto1 { get; set; }
    public double Impuesto2 { get; set; }
    public string Pendiente { get; set; }
    public string CodigoCliente { get; set; }
    public int TipoDocumento { get; set; }
    public string TipoRelacion { get; set; }
}

class Detalle
{
    public int Renglon { get; set; }
    public string CodigoProducto { get; set; }
    public double Cantidad { get; set; }
    public double PrecioUnitario { get; set; }
    public string Referencia { get; set; }
    public double? DesctoImp { get; set; }

    // DATOS DE APLICACIÓN DE SALDO EN PARTIDAS
    public string FacturaOrigen_Concepto { get; set; }
    public string FacturaOrigen_Serie { get; set; }
    public double? FacturaOrigen_Folio { get; set; }
    public string FacturaOrigen_UUID { get; set; }
    public double? ImporteAplicado { get; set; }
}

internal static class LocalSdk
{
    [DllImport("MGW_SDK.dll")]
    public static extern int fBuscaUnidad(string aCodigoUnidad);
}