package com.mealapp.infrastructure.repository;

import jakarta.persistence.EntityManager;
import org.springframework.data.jpa.repository.support.CrudMethodMetadata;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.data.querydsl.EntityPathResolver;
import org.springframework.data.repository.core.RepositoryMetadata;
import org.springframework.data.repository.core.support.RepositoryComposition;
import org.springframework.data.repository.core.support.RepositoryFragment;
import org.springframework.lang.NonNull;

public class QueryDslCustomRepositoryFactory extends JpaRepositoryFactory {

	/**
	 * Creates a new {@link JpaRepositoryFactory}.
	 *
	 * @param entityManager must not be {@literal null}
	 */
	public QueryDslCustomRepositoryFactory(EntityManager entityManager) {
		super(entityManager);
	}

	@Override
	@NonNull
	protected RepositoryComposition.RepositoryFragments getRepositoryFragments(
		@NonNull RepositoryMetadata metadata,
		@NonNull EntityManager entityManager,
		@NonNull EntityPathResolver resolver,
		@NonNull CrudMethodMetadata crudMethodMetadata
	) {
		RepositoryComposition.RepositoryFragments fragments = super.getRepositoryFragments(metadata, entityManager, resolver, crudMethodMetadata);

		if (QueryDslCustomSelector.class.isAssignableFrom(metadata.getRepositoryInterface())) {
			return fragments.append(
				RepositoryFragment.implemented(
					new QueryDslCustomSelectorImpl<>(entityManager, getEntityInformation(metadata.getDomainType()), resolver)
				)
			);
		}
		else {
			return fragments;
		}
	}

}
