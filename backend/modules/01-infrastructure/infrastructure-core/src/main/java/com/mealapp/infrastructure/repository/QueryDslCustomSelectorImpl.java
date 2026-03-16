package com.mealapp.infrastructure.repository;

import com.querydsl.core.NonUniqueResultException;
import com.querydsl.core.types.EntityPath;
import com.querydsl.core.types.Predicate;
import com.querydsl.core.types.dsl.PathBuilder;
import com.querydsl.jpa.JPQLQuery;
import com.querydsl.jpa.impl.AbstractJPAQuery;
import jakarta.persistence.EntityManager;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.support.JpaEntityInformation;
import org.springframework.data.jpa.repository.support.Querydsl;
import org.springframework.data.querydsl.EntityPathResolver;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;

public class QueryDslCustomSelectorImpl<T> implements QueryDslCustomSelector<T> {

	public static final int SINGLE_SELECT_LIMIT = 2;
	private final EntityPath<T> path;
	private final Querydsl querydsl;

	public QueryDslCustomSelectorImpl(
		EntityManager entityManager,
		JpaEntityInformation<T, ?> entityInformation,
		EntityPathResolver resolver
	) {
		this.path = resolver.createPath(entityInformation.getJavaType());
		this.querydsl = new Querydsl(entityManager, new PathBuilder<>(path.getType(), path.getMetadata()));
	}

	@SuppressWarnings("unchecked")
	@Override
	@NonNull
	public <S> Optional<S> findOne(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate
	) {
		AbstractJPAQuery<?, ?> initialQuery = querydsl.createQuery(path);
		JPQLQuery<S> selectQuery = selector.apply((JPQLQuery<T>) initialQuery, querydsl);

		if (predicate != null) {
			selectQuery = selectQuery.where(predicate);
		}

		try {
			return Optional.ofNullable(
				selectQuery.limit(SINGLE_SELECT_LIMIT).fetchOne()
			);
		}
		catch (NonUniqueResultException e) {
			throw new IncorrectResultSizeDataAccessException(e.getMessage(), 1, e);
		}
	}

	@SuppressWarnings("unchecked")
	@Override
	@NonNull
	public <S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@Nullable Sort sort
	) {
		AbstractJPAQuery<?, ?> initialQuery = querydsl.createQuery(path);
		JPQLQuery<S> selectQuery = selector.apply((JPQLQuery<T>) initialQuery, querydsl);

		if (predicate != null) {
			selectQuery = selectQuery.where(predicate);
		}

		if (sort != null) {
			selectQuery = querydsl.applySorting(sort, selectQuery);
		}

		return selectQuery.fetch();
	}

	@SuppressWarnings("unchecked")
	@Override
	@NonNull
	public <S> Page<S> findAll(
		@NonNull  BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@NonNull Pageable pageable
	) {
		AbstractJPAQuery<?, ?> initialQuery = querydsl.createQuery(path);
		JPQLQuery<S> selectQuery = selector.apply((JPQLQuery<T>) initialQuery, querydsl);

		if (predicate != null) {
			selectQuery = selectQuery.where(predicate);
		}

		long count = selectQuery.fetchCount();
		if (pageable.isPaged() && pageable.getOffset() >= count) {
			return new PageImpl<>(Collections.emptyList(), pageable, count);
		}

		List<S> items = querydsl.applyPagination(pageable, selectQuery).fetch();
		return new PageImpl<>(items, pageable, count);
	}

}
