package com.mealapp.infrastructure.repository;

import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Predicate;
import com.querydsl.jpa.JPQLQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.support.Querydsl;
import org.springframework.data.querydsl.QSort;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;

@SuppressWarnings("unused")
public interface QueryDslCustomSelector<T> {

	@NonNull
	default <S> Optional<S> findOne(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector
	) {
		return findOne(
			(query, querydsl) -> selector.apply(query),
			null
		);
	}

	@NonNull
	default <S> Optional<S> findOne(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@Nullable Predicate predicate
	) {
		return findOne(
			(query, querydsl) -> selector.apply(query),
			predicate
		);
	}

	@NonNull
	default <S> Optional<S> findOne(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector
	) {
		return findOne(selector, null);
	}

	@NonNull
	<S> Optional<S> findOne(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate
	);

	@NonNull
	default <S> List<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			null,
			(Sort) null
		);
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector
	) {
		return findAll(selector, null, (Sort) null);
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@NonNull Predicate predicate
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			predicate,
			(Sort) null
		);
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@NonNull Predicate predicate
	) {
		return findAll(selector, predicate, (Sort) null);
	}

	default <S> List<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@NonNull OrderSpecifier<?>... orders
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			null,
			new QSort(orders)
		);
	}

	default <S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@NonNull OrderSpecifier<?>... orders
	) {
		return findAll(selector, null, new QSort(orders));
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@NonNull Sort sort
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			null,
			sort
		);
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@NonNull Sort sort
	) {
		return findAll(selector, null, sort);
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@Nullable OrderSpecifier<?>... orders
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			predicate,
			orders == null ? null : new QSort(orders)
		);
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@Nullable OrderSpecifier<?>... orders
	) {
		return findAll(selector, predicate, orders == null ? null : new QSort(orders));
	}

	@NonNull
	default <S> List<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@Nullable Sort sort
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			predicate,
			sort
		);
	}

	@NonNull
	<S> List<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@Nullable Sort sort
	);

	@NonNull
	default <S> Page<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@NonNull Pageable pageable
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			null,
			pageable
		);
	}

	@NonNull
	default <S> Page<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@NonNull Pageable pageable
	) {
		return findAll(selector, null, pageable);
	}

	@NonNull
	default <S> Page<S> findAll(
		@NonNull Function<JPQLQuery<T>, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@NonNull Pageable pageable
	) {
		return findAll(
			(query, querydsl) -> selector.apply(query),
			predicate,
			pageable
		);
	}

	@NonNull
	<S> Page<S> findAll(
		@NonNull BiFunction<JPQLQuery<T>, Querydsl, JPQLQuery<S>> selector,
		@Nullable Predicate predicate,
		@NonNull Pageable pageable
	);

}
