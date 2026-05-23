import prisma from '../config/database.js';

class LegalService {
  // ==========================================
  // DOCUMENTS MANAGEMENT
  // ==========================================

  /**
   * Obtenir le document actif pour un type et une langue
   */
  async getActiveDocument(type: string, language: string = 'fr') {
    const document = await prisma.legalDocument.findFirst({
      where: {
        type,
        language,
        is_active: true,
      },
      orderBy: {
        effective_date: 'desc',
      },
    });

    if (!document) {
      throw new Error(`No active ${type} document found for language ${language}`);
    }

    return document;
  }

  /**
   * Obtenir l'historique des versions d'un document
   */
  async getDocumentHistory(type: string, language: string = 'fr') {
    const documents = await prisma.legalDocument.findMany({
      where: {
        type,
        language,
      },
      orderBy: {
        effective_date: 'desc',
      },
      select: {
        id: true,
        version: true,
        title: true,
        effective_date: true,
        created_at: true,
        is_active: true,
      },
    });

    return documents;
  }

  /**
   * Obtenir un document par son ID
   */
  async getDocumentById(documentId: string) {
    const document = await prisma.legalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Créer un nouveau document légal
   */
  async createDocument(data: {
    type: string;
    version: string;
    language: string;
    title: string;
    content: string;
    effectiveDate: Date;
    createdBy: string;
  }) {
    // Vérifier si cette version existe déjà
    const existing = await prisma.legalDocument.findUnique({
      where: {
        type_version_language: {
          type: data.type,
          version: data.version,
          language: data.language,
        },
      },
    });

    if (existing) {
      throw new Error(`Document version ${data.version} already exists for ${data.type} in ${data.language}`);
    }

    const document = await prisma.legalDocument.create({
      data: {
        type: data.type,
        version: data.version,
        language: data.language,
        title: data.title,
        content: data.content,
        effective_date: data.effectiveDate,
        created_by: data.createdBy,
        is_active: false, // Créé inactif par défaut
      },
    });

    return document;
  }

  /**
   * Activer un document (et désactiver les autres de même type/langue)
   */
  async activateDocument(documentId: string) {
    const document = await prisma.legalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Transaction pour désactiver les autres et activer celui-ci
    await prisma.$transaction([
      // Désactiver tous les documents du même type et langue
      prisma.legalDocument.updateMany({
        where: {
          type: document.type,
          language: document.language,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      }),
      // Activer le document
      prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          is_active: true,
        },
      }),
    ]);

    const updatedDocument = await prisma.legalDocument.findUnique({
      where: { id: documentId },
    });

    return updatedDocument;
  }

  /**
   * Désactiver un document
   */
  async deactivateDocument(documentId: string) {
    const document = await prisma.legalDocument.update({
      where: { id: documentId },
      data: {
        is_active: false,
      },
    });

    return document;
  }

  /**
   * Obtenir tous les documents (admin)
   */
  async getAllDocuments() {
    const documents = await prisma.legalDocument.findMany({
      orderBy: [
        { type: 'asc' },
        { language: 'asc' },
        { effective_date: 'desc' },
      ],
      select: {
        id: true,
        type: true,
        version: true,
        language: true,
        title: true,
        effective_date: true,
        created_at: true,
        is_active: true,
        created_by: true,
      },
    });

    return documents;
  }

  // ==========================================
  // USER ACCEPTANCES
  // ==========================================

  /**
   * Enregistrer l'acceptation d'un document par un utilisateur
   */
  async acceptDocument(data: {
    userId: string;
    documentId?: string;
    documentType?: string;
    ipAddress: string;
    userAgent: string;
  }) {
    let documentId = data.documentId;

    // Si documentType fourni mais pas documentId, chercher le document actif
    if (!documentId && data.documentType) {
      const activeDoc = await this.getActiveDocument(data.documentType);
      documentId = activeDoc.id;
    }

    if (!documentId) {
      throw new Error('Document ID or type is required');
    }

    const document = await prisma.legalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Vérifier si déjà accepté
    const existing = await prisma.userLegalAcceptance.findFirst({
      where: {
        user_id: data.userId,
        document_id: documentId,
        version: document.version,
      },
    });

    if (existing) {
      return existing; // Déjà accepté
    }

    // Créer l'acceptation
    const acceptance = await prisma.userLegalAcceptance.create({
      data: {
        user_id: data.userId,
        document_id: documentId,
        version: document.version,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
      include: {
        document: {
          select: {
            type: true,
            title: true,
            version: true,
          },
        },
      },
    });

    // Log l'acceptation dans ConsentLog
    await prisma.consentLog.create({
      data: {
        user_id: data.userId,
        consent_type: document.type,
        consent_given: true,
        consent_version: document.version,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
    });

    return acceptance;
  }

  /**
   * Obtenir les acceptations d'un utilisateur
   */
  async getUserAcceptances(userId: string) {
    const acceptances = await prisma.userLegalAcceptance.findMany({
      where: { user_id: userId },
      include: {
        document: {
          select: {
            type: true,
            version: true,
            title: true,
            language: true,
          },
        },
      },
      orderBy: {
        accepted_at: 'desc',
      },
    });

    return acceptances;
  }

  /**
   * Vérifier si l'utilisateur doit accepter de nouveaux documents
   */
  async checkRequiredAcceptances(userId: string) {
    // Documents obligatoires
    const requiredTypes = ['privacy_policy', 'terms_of_service'];
    
    const required: any[] = [];

    for (const type of requiredTypes) {
      const activeDoc = await prisma.legalDocument.findFirst({
        where: {
          type,
          language: 'fr', // TODO: utiliser la langue de l'utilisateur
          is_active: true,
        },
      });

      if (!activeDoc) continue;

      // Vérifier si l'utilisateur a accepté cette version
      const acceptance = await prisma.userLegalAcceptance.findFirst({
        where: {
          user_id: userId,
          document_id: activeDoc.id,
          version: activeDoc.version,
        },
      });

      if (!acceptance) {
        required.push({
          document_id: activeDoc.id,
          type: activeDoc.type,
          title: activeDoc.title,
          version: activeDoc.version,
          effective_date: activeDoc.effective_date,
        });
      }
    }

    return {
      has_required: required.length > 0,
      documents: required,
    };
  }

  /**
   * Statistiques d'acceptation (admin)
   */
  async getAcceptanceStats() {
    const totalUsers = await prisma.user.count();

    const stats = await prisma.legalDocument.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        type: true,
        version: true,
        title: true,
        language: true,
        _count: {
          select: {
            acceptances: true,
          },
        },
      },
    });

    return stats.map(doc => ({
      ...doc,
      acceptance_count: doc._count.acceptances,
      acceptance_rate: totalUsers > 0 ? ((doc._count.acceptances / totalUsers) * 100).toFixed(2) : '0.00',
    }));
  }

  // ==========================================
  // LEGAL ENTITY INFO
  // ==========================================

  /**
   * Obtenir les informations légales de l'entreprise
   */
  async getLegalEntityInfo() {
    const info = await prisma.legalEntityInfo.findFirst();
    
    if (!info) {
      // Retourner des valeurs par défaut
      return {
        company_name: 'AfriWonder',
        email: 'legal@afriwonder.app',
        dpo_email: 'dpo@afriwonder.app',
        country: 'Sénégal',
      };
    }

    return info;
  }

  /**
   * Mettre à jour les informations légales de l'entreprise
   */
  async updateLegalEntityInfo(data: any) {
    const existing = await prisma.legalEntityInfo.findFirst();

    if (existing) {
      return await prisma.legalEntityInfo.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return await prisma.legalEntityInfo.create({
        data,
      });
    }
  }
}

export default new LegalService();
