import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Shield, ShieldCheck, ShieldAlert, Lock, Server, 
  Database, Globe, HardDrive, Cpu, Activity, UploadCloud, 
  CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  FileArchive, RefreshCw, Trash2, Download, Search,
  Layers, Check, ArrowLeft, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CloudAuditService } from '@/services/cloudAuditService';
import type { 
  AuditProject, 
  AuditCheck, 
  AWSServiceRecommendation 
} from '@/services/cloudAuditService';

export const CloudAuditoriaPage: React.FC = () => {
  const [projects, setProjects] = useState<AuditProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AuditProject | null>(null);
  const [activeInputTab, setActiveInputTab] = useState<'url' | 'zip'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [selectedResultTab, setSelectedResultTab] = useState<'aws' | 'audit' | 'zip'>('aws');
  const [checkFilter, setCheckFilter] = useState<'all' | 'fail' | 'warn' | 'pass'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const SCAN_STEPS = [
    'Estableciendo conexión y validando sintaxis de red...',
    'Inspeccionando certificados digitales SSL/TLS y cifrado...',
    'Evaluando cabeceras defensivas HTTP (HSTS, CSP, X-Frame)...',
    'Escaneando higiene de credenciales y variables de entorno...',
    'Dimensionando servicios y arquitectura en Amazon Web Services (AWS)...'
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const list = CloudAuditService.getProjects();
    setProjects(list);
  };

  const handleAnalyzeUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMessage('Por favor ingresa una URL válida para analizar.');
      return;
    }
    setErrorMessage(null);
    setIsAnalyzing(true);
    setScanStep(0);

    const stepInterval = setInterval(() => {
      setScanStep(prev => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 700);

    try {
      const result = await CloudAuditService.analyzeUrl(urlInput);
      clearInterval(stepInterval);
      setProjects(CloudAuditService.getProjects());
      setSelectedProject(result);
      setSelectedResultTab('aws');
      setUrlInput('');
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err.message || 'Error al analizar la URL.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Por favor sube un archivo comprimido en formato .ZIP.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setScanStep(0);

    const stepInterval = setInterval(() => {
      setScanStep(prev => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 800);

    try {
      const result = await CloudAuditService.analyzeZipFile(file);
      clearInterval(stepInterval);
      setProjects(CloudAuditService.getProjects());
      setSelectedProject(result);
      setSelectedResultTab('aws');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err.message || 'Error al inspeccionar el archivo .ZIP.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas eliminar este registro de auditoría?')) {
      CloudAuditService.deleteProject(id);
      const updated = CloudAuditService.getProjects();
      setProjects(updated);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    }
  };

  const handleOpenDetails = (proj: AuditProject) => {
    setSelectedProject(proj);
    setSelectedResultTab('aws');
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleCloseDetails = () => {
    setSelectedProject(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrintReport = () => {
    window.print();
  };

  const renderAwsIcon = (key: string, className = 'w-6 h-6') => {
    switch (key) {
      case 'Globe': return <Globe className={className} />;
      case 'Server': return <Server className={className} />;
      case 'Database': return <Database className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Lock': return <Lock className={className} />;
      case 'HardDrive': return <HardDrive className={className} />;
      case 'Cpu': return <Cpu className={className} />;
      case 'Activity': return <Activity className={className} />;
      default: return <Cloud className={className} />;
    }
  };

  const filteredChecks = selectedProject?.checks.filter(c => {
    if (checkFilter === 'all') return true;
    return c.status === checkFilter;
  }) || [];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* 1. HERO SCANNER: DISEÑO CLARO / BLANCO (ESTILO GOOGLE PAGESPEED INSIGHTS) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 dark:border-slate-700/80 transition-colors">
        
        {/* Cabecera limpia */}
        <div className="max-w-3xl space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Auditoría de Ciberseguridad & Migración Cloud AWS
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Analiza la seguridad de tu proyecto y planifica su infraestructura en AWS
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
            Ingresa un enlace web o sube el archivo comprimido (.ZIP) de tu proyecto. El sistema evaluará su postura de seguridad bajo estándares <strong>OWASP</strong> y generará la arquitectura recomendada en <strong>Amazon Web Services</strong>.
          </p>
        </div>

        {/* Pestañas de Selección: URL vs ZIP */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveInputTab('url')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeInputTab === 'url'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            <Globe className="w-4 h-4" />
            Analizar por Enlace / URL Web
          </button>
          <button
            type="button"
            onClick={() => setActiveInputTab('zip')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeInputTab === 'zip'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            Analizar Proyecto Comprimido (.ZIP)
          </button>
        </div>

        {/* Input Barra Modo URL */}
        {activeInputTab === 'url' && (
          <form onSubmit={handleAnalyzeUrl} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Ingresar la URL de una página web (ej. https://mi-erp-cloud.vercel.app o dominio)"
                disabled={isAnalyzing}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-sm md:text-base transition-all shadow-md shadow-blue-600/20 shrink-0 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Analizar Seguridad
                </>
              )}
            </button>
          </form>
        )}

        {/* Input Barra Modo Subir ZIP */}
        {activeInputTab === 'zip' && (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".zip"
              className="hidden"
              id="zip-upload-input"
              disabled={isAnalyzing}
            />
            <label
              htmlFor="zip-upload-input"
              className="flex-1 flex items-center justify-center gap-3 py-4 px-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl cursor-pointer text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-all w-full text-center group bg-white dark:bg-slate-800"
            >
              <UploadCloud className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">
                {isAnalyzing ? 'Inspeccionando archivo...' : 'Haz clic aquí para seleccionar el archivo comprimido (.ZIP) de tu proyecto'}
              </span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer shrink-0"
            >
              <FileArchive className="w-5 h-5" />
              Examinar Archivo
            </button>
          </div>
        )}

        {/* Pruebas sugeridas */}
        {activeInputTab === 'url' && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Pruebas sugeridas:</span>
            <button
              type="button"
              onClick={() => setUrlInput('https://erp-enterprise-cloud.vercel.app')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              ERP Cloud (Vercel)
            </button>
            <button
              type="button"
              onClick={() => setUrlInput('https://github.com')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              GitHub Oficial
            </button>
            <button
              type="button"
              onClick={() => setUrlInput('http://inseguro-demo.com')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              Demo HTTP Inseguro
            </button>
          </div>
        )}

        {/* Mensaje de error */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs md:text-sm flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Indicador de escaneo animado */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                Ejecutando auditoría de seguridad y motor de recomendación AWS...
              </span>
              <span>Paso {scanStep + 1} de {SCAN_STEPS.length}</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-blue-600 dark:bg-blue-400 h-full rounded-full"
                initial={{ width: '15%' }}
                animate={{ width: `${((scanStep + 1) / SCAN_STEPS.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic">
              {SCAN_STEPS[scanStep]}
            </p>
          </motion.div>
        )}

      </div>

      {/* 2. REPORTE EN DETALLE (SOLO APARECE AL HACER CLIC EN 'VER MÁS DETALLES' O AL ANALIZAR) */}
      {selectedProject && (
        <div ref={detailsRef} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700/80">
            
            {/* Barra superior con botón volver */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a la lista de proyectos guardados
                </button>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedProject.name}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedProject.riskLevel === 'BAJO' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20' 
                      : selectedProject.riskLevel === 'MEDIO'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-300 dark:border-rose-500/20'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    Riesgo {selectedProject.riskLevel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                    {selectedProject.inputType === 'url' ? <Globe className="w-3 h-3" /> : <FileArchive className="w-3 h-3" />}
                    {selectedProject.inputType === 'url' ? 'URL Web' : 'Archivo ZIP'}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-mono">
                  Target: {selectedProject.target} • Escaneado el {new Date(selectedProject.createdAt).toLocaleString('es-PE')}
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Imprimir / PDF
                </button>
              </div>
            </div>

            {/* Medidor Circular de Score & 4 Pilares de Seguridad */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-6">
              
              {/* Medidor Circular Estilo PageSpeed */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-slate-200 dark:text-slate-700 stroke-current"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={`stroke-current transition-all duration-1000 ease-out ${
                        selectedProject.overallScore >= 90
                          ? 'text-emerald-500'
                          : selectedProject.overallScore >= 60
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * selectedProject.overallScore) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-extrabold tracking-tight ${
                      selectedProject.overallScore >= 90
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : selectedProject.overallScore >= 60
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {selectedProject.overallScore}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      de 100 pts
                    </span>
                  </div>
                </div>

                <div className="text-center mt-3 space-y-1">
                  <span className={`text-sm font-bold block ${
                    selectedProject.overallScore >= 90
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : selectedProject.overallScore >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedProject.overallScore >= 90 ? 'Excelente Seguridad' : selectedProject.overallScore >= 60 ? 'Seguridad Aceptable' : 'Riesgo Crítico'}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Evaluación de seguridad basada en estándares OWASP Top 10 y AWS Well-Architected.
                  </p>
                </div>
              </div>

              {/* 4 Pilares */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedProject.pillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {pillar.name}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        pillar.status === 'good'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : pillar.status === 'warning'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      }`}>
                        {pillar.score} / {pillar.maxScore}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pillar.status === 'good'
                            ? 'bg-emerald-500'
                            : pillar.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${(pillar.score / pillar.maxScore) * 100}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Selector de Pestañas: 1. Servicios AWS • 2. Auditoría Detallada • 3. Código ZIP */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            <button
              type="button"
              onClick={() => setSelectedResultTab('aws')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedResultTab === 'aws'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4" />
              Servicios de AWS para Migrar ({selectedProject.awsArchitecture.services.length} servicios)
            </button>
            <button
              type="button"
              onClick={() => setSelectedResultTab('audit')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedResultTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Comprobaciones OWASP ({selectedProject.checks.length} hallazgos)
            </button>
            {selectedProject.zipMetadata && (
              <button
                type="button"
                onClick={() => setSelectedResultTab('zip')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  selectedResultTab === 'zip'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileArchive className="w-4 h-4" />
                Inspección del Código ZIP
              </button>
            )}
          </div>

          {/* VISTA 1: SERVICIOS DE AWS (CON ¿QUÉ HACE? Y ¿POR QUÉ UTILIZARLO?) */}
          {selectedResultTab === 'aws' && (
            <div className="space-y-6">
              
              {/* Tarjetas de Resumen Ejecutivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nivel de Esfuerzo</span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {selectedProject.awsArchitecture.effortLevel}
                  </div>
                  <p className="text-[11px] text-slate-500">Estimación de complejidad para migración sin tiempo de inactividad.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Costo Mensual Estimado</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedProject.awsArchitecture.estimatedMonthlyCost}
                  </div>
                  <p className="text-[11px] text-slate-500">Optimizando instancias y aprovechando la capa gratuita de AWS (Free Tier).</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tier Recomendado</span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {selectedProject.awsArchitecture.tier}
                  </div>
                  <p className="text-[11px] text-slate-500">Arquitectura de alta disponibilidad con réplica síncrona en otra zona.</p>
                </div>
              </div>

              {/* Lista Detallada de Servicios de AWS */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    Servicios de Amazon Web Services Recomendados para este Proyecto
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cada servicio incluye su explicación técnica (¿Qué hace?) y su justificación directa para este sistema (¿Por qué debemos utilizarlo?).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {selectedProject.awsArchitecture.services.map((srv, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                    >
                      {/* Cabecera del Servicio */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                            {renderAwsIcon(srv.iconKey, 'w-6 h-6')}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                              {srv.name}
                            </h4>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {srv.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {srv.freeTier && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                              Free Tier
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {srv.badge}
                          </span>
                        </div>
                      </div>

                      {/* BLOQUE 1: ¿QUÉ HACE ESTE SERVICIO EN AWS? */}
                      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-500/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>¿Qué hace este servicio en AWS?</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {srv.whatItDoes || srv.purpose}
                        </p>
                      </div>

                      {/* BLOQUE 2: ¿POR QUÉ DEBEMOS UTILIZARLO EN ESTE PROYECTO? */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-500/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>¿Por qué debemos utilizarlo en este proyecto?</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {srv.whyUseIt || srv.whyNeeded}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hoja de Ruta de Migración (4 Fases) */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 space-y-6 shadow-xl border border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    Flujo de Implementación de la Arquitectura en AWS
                  </h3>
                  <p className="text-xs text-slate-400">
                    Plan secuencial para migrar este sistema a producción en la nube de Amazon Web Services.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedProject.awsArchitecture.flowSteps.map((step) => (
                    <div
                      key={step.step}
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative overflow-hidden backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                          {step.step}
                        </span>
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                          {step.phase}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {step.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                        {step.awsServices.map((srvName, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-semibold"
                          >
                            {srvName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* VISTA 2: AUDITORÍA DETALLADA OWASP */}
          {selectedResultTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Filtrar comprobaciones:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      checkFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Todos ({selectedProject.checks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckFilter('fail')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      checkFilter === 'fail'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}
                  >
                    Críticos ({selectedProject.checks.filter(c => c.status === 'fail').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckFilter('warn')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      checkFilter === 'warn'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
                    Advertencias ({selectedProject.checks.filter(c => c.status === 'warn').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckFilter('pass')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      checkFilter === 'pass'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}
                  >
                    Aprobados ({selectedProject.checks.filter(c => c.status === 'pass').length})
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredChecks.map((chk) => (
                  <div
                    key={chk.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {chk.status === 'pass' && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          )}
                          {chk.status === 'warn' && (
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                          )}
                          {chk.status === 'fail' && (
                            <XCircle className="w-5 h-5 text-rose-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                            {chk.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {chk.details}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          chk.impact === 'CRÍTICO'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                            : chk.impact === 'ALTO'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        }`}>
                          Impacto {chk.impact}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          +{chk.points} / {chk.maxPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Recomendación:</span>
                        <span>{chk.recommendation}</span>
                      </div>
                      {chk.awsServiceMitigation && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] shrink-0 border border-indigo-200 dark:border-indigo-500/20">
                          <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                          Mitigación AWS: {chk.awsServiceMitigation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 3: INSPECCIÓN DEL CÓDIGO ZIP (SI APLICA) */}
          {selectedResultTab === 'zip' && selectedProject.zipMetadata && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileArchive className="w-5 h-5 text-blue-600" />
                  Estructura y Archivos Inspeccionados en el .ZIP
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total de archivos procesados: {selectedProject.zipMetadata.fileCount} • Tamaño: {selectedProject.zipMetadata.totalSizeKb} KB
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Stack Tecnológico Reconocido:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.zipMetadata.detectedStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-500/20 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-blue-500" />
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Archivos Sensibles o Privados Detectados
                  </h4>
                  {selectedProject.zipMetadata.sensitiveFilesFound.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ No se detectaron archivos .env ni llaves privadas expuestas. Excelente higiene.
                    </p>
                  ) : (
                    <ul className="text-xs text-rose-600 dark:text-rose-400 space-y-1 list-disc pl-4 font-mono">
                      {selectedProject.zipMetadata.sensitiveFilesFound.map((file, idx) => (
                        <li key={idx}>{file}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Buenas Prácticas Reconocidas
                  </h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    {selectedProject.zipMetadata.safePractices.map((pra, idx) => (
                      <li key={idx}>{pra}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. APARTADO DONDE SE GUARDAN LOS PROYECTOS CON SU URL O ZIP */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700/60 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Proyectos Guardados & Historial de Evaluaciones
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aquí se guardan los proyectos evaluados por URL o archivo comprimido (.ZIP). Haz clic en <strong>Ver más detalles</strong> para ver su arquitectura en AWS y su auditoría.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {projects.length} {projects.length === 1 ? 'proyecto registrado' : 'proyectos registrados'}
          </span>
        </div>

        {/* Estado Vacío */}
        {projects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Globe className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">
              No hay proyectos analizados todavía
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Ingresa la URL de una página web o sube el archivo .ZIP de tu proyecto en la parte superior para realizar la primera auditoría.
            </p>
          </div>
        ) : (
          /* Tabla de Proyectos Guardados */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/40 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Nombre / Identificador</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">URL / Archivo Objetivo</th>
                  <th className="py-3 px-4">Score de Seguridad</th>
                  <th className="py-3 px-4">Riesgo</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-normal">
                {projects.map((proj) => (
                  <tr
                    key={proj.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {proj.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {proj.inputType === 'url' ? <Globe className="w-3.5 h-3.5 text-blue-500" /> : <FileArchive className="w-3.5 h-3.5 text-amber-500" />}
                        {proj.inputType === 'url' ? 'Enlace URL' : 'Archivo ZIP'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs block" title={proj.target}>
                        {proj.target}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-sm font-extrabold ${
                        proj.overallScore >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : proj.overallScore >= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {proj.overallScore} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        proj.riskLevel === 'BAJO'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : proj.riskLevel === 'MEDIO'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        {proj.riskLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(proj.createdAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(proj)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                        >
                          <span>Ver más detalles</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(proj.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Eliminar de proyectos guardados"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
