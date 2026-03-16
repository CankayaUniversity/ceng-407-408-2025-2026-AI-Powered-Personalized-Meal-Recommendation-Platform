package com.mealapp.infrastructure.repository;

import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.query.EscapeCharacter;
import org.springframework.data.jpa.repository.query.JpaQueryMethodFactory;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactoryBean;
import org.springframework.data.querydsl.EntityPathResolver;
import org.springframework.data.querydsl.SimpleEntityPathResolver;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.core.support.RepositoryFactorySupport;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

public class QueryDslCustomRepositoryFactoryBean<T extends Repository<S, I>, S, I>
	extends JpaRepositoryFactoryBean<T, S, I> {

	private static final EscapeCharacter escapeCharacter = EscapeCharacter.DEFAULT;

	private EntityPathResolver entityPathResolver;
	private JpaQueryMethodFactory queryMethodFactory;

	/**
	 * Creates a new {@link JpaRepositoryFactoryBean} for the given repository interface.
	 *
	 * @param repositoryInterface must not be {@literal null}.
	 */
	public QueryDslCustomRepositoryFactoryBean(Class<? extends T> repositoryInterface) {
		super(repositoryInterface);
	}

	@Autowired
	@Override
	public void setEntityPathResolver(ObjectProvider<EntityPathResolver> resolver) {
		this.entityPathResolver = resolver.getIfAvailable(() -> SimpleEntityPathResolver.INSTANCE);
		super.setEntityPathResolver(resolver);
	}

	/**
	 * Configures the {@link JpaQueryMethodFactory} to be used. Will expect a canonical bean to be present but will
	 * fallback to {@link org.springframework.data.jpa.repository.query.DefaultJpaQueryMethodFactory} in case none is
	 * available.
	 *
	 * @param factory may be {@literal null}.
	 */
	@Autowired
	@Override
	public void setQueryMethodFactory(@Nullable JpaQueryMethodFactory factory) {
		if (factory != null) {
			this.queryMethodFactory = factory;
		}
		super.setQueryMethodFactory(factory);
	}

	@Override
	@NonNull
	protected RepositoryFactorySupport createRepositoryFactory(@NonNull EntityManager entityManager) {
		JpaRepositoryFactory jpaRepositoryFactory = new QueryDslCustomRepositoryFactory(entityManager);
		jpaRepositoryFactory.setEntityPathResolver(entityPathResolver);
		jpaRepositoryFactory.setEscapeCharacter(escapeCharacter);

		if (queryMethodFactory != null) {
			jpaRepositoryFactory.setQueryMethodFactory(queryMethodFactory);
		}

		return jpaRepositoryFactory;
	}

}
