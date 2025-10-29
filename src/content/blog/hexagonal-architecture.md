---
title: "Hexagonal Architecture: A Modern Approach to Software Design"
description: "Applying Hexagonal Architecture and Domain-Driven Design to escape the pitfalls of traditional layered architecture"
pubDate: 2025-10-29
updatedDate: 2025-10-29
coverImageCredit: "Hexagonal Architecture Diagram"
---

## Introduction

When building backend systems, most developers start with the familiar Controller, Service and Database layered architecture. It's simple, intuitive. However, as the application grows and scaling, this approach often reveals its limitations. This article shares my journey of refactoring a backend system from traditional layered architecture to hexagonal architecture combined with domain-driven design principles.

## Disadvantages of Traditional Layered Architecture

In a typical layered architecture, the flow is goes to controllers first, services then the Database layer.

<img src="/src/assets/blogimages/hexagonal-architecture/CSD.png" alt="Traditional Controller-Service-Database Architecture" style="max-width: 350px; height: auto;" loading="lazy" />

_Figure 1: Traditional Controller-Service-Database Architecture_

This approach seems reasonable at first, but I encountered several issues when trying to extend the system:

**Tight Coupling to Database Schema**: The service layer became heavily depends on the database schema. Business logic was mixed with database queries and schema structures. When adding new features, services mixing business rules with database operations. This obviously violate the single responsibility principle (SRP).

**Database Driven Design**: The domain model mirrors directly to the database schema instead of the actual business rules.

**Poor Flexibility**: Changing the underlying database implementation or switching to a different service provider meant rewriting substantial portions of service code. Each layer's dependency on the lower layer created a chain change through multiple layers.

The root cause is **Dependency flows in the wrong direction**. Business logic should not depend on infrastructure details.

## Hexagonal Architecture

Hexagonal architecture, also known as the "ports and adapters" pattern, inverts these dependencies. The core principle is simple: **business logic should be at the center and independent of external concerns**.

![Hexagonal Architecture](/src/assets/blogimages/hexagonal-architecture/cover.png)

_Figure 2: Hexagonal Architecture - Ports and Adapters Pattern_

The architecture consists of three key concepts:

**Domain**: Contains pure business logic, entities, and business rules. It defines what the application does without caring about how external systems work.

**Ports**: Interfaces that define contracts for interacting with the outside world. Input ports expose use cases, while output ports define what the domain needs from external systems.

**Adapters**: Implementations that connect external systems to the ports. Translate between the domain's language and external systems' formats.

The critical insight: **dependencies inversion**. The domain defines interfaces, and infrastructure implements them. This is the Dependency Inversion Principle in action.

## Integrating Domain-Driven Design

Hexagonal architecture provides the structural framework, domain-driven design (DDD) helps model the business logic within the core. In the modern design, they often integrate together

**Entities**: Objects represents identity that persists over time. These represent core business concepts.

**Value Objects**: Immutable objects defined by their attributes rather than identity. They encapsulate validation logic and business invariants.

**Repositories**: Abstractions for data access defined in the domain layer as interfaces, implemented in the infrastructure layer. This keeps persistence concerns out of business logic.

The combination of hexagonal architecture and DDD creates a clear separation: hexagonal architecture defines where code lives, while DDD defines how to model the core domain.

## Implementation

My design of this architecture contains four layers: Presentation Layer, Controller Layer, Domain Layer and Application Layer.

Source Code: [GitHub repository](https://github.com/unsigend/progress-tracker-server).

![Implementation Architecture](/src/assets/blogimages/hexagonal-architecture/HA-design.png)

_Figure 3: Four-Layer Hexagonal Architecture Implementation_

### Presentation Layer

The outermost layer handles HTTP communication. It contains:

- **Controllers**: Handle HTTP requests and responses
- **DTOs (Data Transfer Objects)**: Define the API contract for requests and responses

Controllers are thin they simply receive requests, invoke use cases through the application layer, and return responses. They know nothing about business logic or database details. This kind of isolation is what the architecture expected.

### Application Layer

This layer orchestrates the application flow through use cases:

- **Use Cases**: Each use case represents a single business operation which apply SRP.
- **Mappers**: Transform data between DTOs and domain entities

Use cases coordinate between the presentation layer and domain layer. They call domain services and repositories to execute business logic, then map results back to DTOs.

### Domain Layer

The heart of the application contains pure business logic:

- **Entities**: Core business objects with identity
- **Value Objects**: Immutable business concepts with validation
- **Repository Interfaces**: interface for data access

This layer has **zero dependencies on infrastructure**. It defines what needs to be done, not how.

### Infrastructure Layer

This layer implements the technical details:

- **Repository Implementations**:Implementations of repository interfaces using Prisma, MongoDB, or other data sources
- **Mappers**: Convert between domain entities and database models (ORM)
- **External Service Adapters**: Implementations for third-party services

The infrastructure depends on the domain, not the other way around. This is the key to flexibility.

## Advantages

After refactoring to Hexagonal Architecture with DDD the overall architecture become loosely coupled.

**Implementation Independence**: The business logic no longer cares whether data comes from PostgreSQL, MongoDB, or an external API. Database providers can be swapped without touching use cases or domain logic.

**Clearer Business Logic**: Value objects encapsulate validation keep the consistency even in unit tests. Entities express business rules in code that matches how domain describe the problem.

**Better Testability**: Domain logic can be tested in isolation with emulation without depending databases or external services. Unit tests for entities and value objects are fast and focused.

**Easier Feature Addition**: Adding new features like RBAC becomes straightforward, business rules exists in the domain layer, separated from HTTP handling and database queries.

## Conclusion

Hexagonal Architecture inverts the traditional dependency flow, the business logic no longer depends on databases or frameworks. Instead, the domain becomes the center, with infrastructure adapting to it through ports and adapters.

This architectural shift transforms tightly coupled services into a flexible, loosely coupled design. Databases, frameworks, or external services can be swapped without changing core business rules. Even it requires more structure decision, the payoff is a clean codebase that evolves with features rather than being constrained by technical decisions.

## References

Martin, R. C. (2017). _Clean Architecture: A Craftsman's Guide to Software Structure and Design_. Prentice Hall.
https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/

Hombergs, T. (2023). _Get Your Hands Dirty on Clean Architecture_. _Leanpub_. https://www.oreilly.com/library/view/get-your-hands/9781805128373/

hgraca (2017). _DDD, Hexagonal, Onion, Clean, CQRS, … How I put it all together_ https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/

Alistair Cockburn (2005). _Hexagonal architecture the original article_ https://alistair.cockburn.us/hexagonal-architecture
